/*
 * Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Oracle designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Oracle in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Oracle, 500 Oracle Parkway, Redwood Shores, CA 94065 USA
 * or visit www.oracle.com if you need additional information or have any
 * questions.
 */
package jdk.incubator.jextract.tool;

import jdk.incubator.jextract.Declaration;
import jdk.incubator.foreign.FunctionDescriptor;
import jdk.incubator.foreign.GroupLayout;
import jdk.incubator.foreign.MemoryAddress;
import jdk.incubator.foreign.MemoryLayout;
import jdk.incubator.foreign.MemoryLayouts;
import jdk.incubator.foreign.MemorySegment;
import jdk.incubator.foreign.SequenceLayout;
import jdk.incubator.foreign.SystemABI;
import jdk.incubator.foreign.ValueLayout;

import java.lang.invoke.MethodType;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

/**
 * A helper class to generate header interface class in source form.
 * After aggregating various constituents of a .java source, build
 * method is called to get overall generated source string.
 */
class JavaSourceBuilder {
    private static final String ABI = SystemABI.getInstance().name();
    // buffer
    protected StringBuffer sb;
    // current line alignment (number of 4-spaces)
    protected int align;

    JavaSourceBuilder(int align) {
        this.align = align;
        this.sb = new StringBuffer();
    }

    JavaSourceBuilder() {
        this(0);
    }

    protected int align() {
        return align;
    }

    final String PUB_CLS_MODS = "public final ";
    final String PUB_MODS = "public static final ";
    final String PRI_MODS = "private static final ";

    protected void addPackagePrefix(String pkgName) {
        assert pkgName.indexOf('/') == -1 : "package name invalid: " + pkgName;
        sb.append("// Generated by jextract\n\n");
        if (!pkgName.isEmpty()) {
            sb.append("package ");
            sb.append(pkgName);
            sb.append(";\n\n");
        }
        addImportSection();
    }

    protected void addImportSection() {
        sb.append("import java.lang.invoke.MethodHandle;\n");
        sb.append("import java.lang.invoke.VarHandle;\n");
        sb.append("import jdk.incubator.foreign.*;\n");
        sb.append("import jdk.incubator.foreign.MemoryLayout.PathElement;\n");
        sb.append("import static ");
        sb.append(HandleSourceFactory.C_LANG_CONSTANTS_HOLDER);
        sb.append(".*;\n");
    }

    protected void classBegin(String name) {
        indent();
        sb.append(PUB_CLS_MODS + "class ");
        sb.append(name);
        sb.append(" {\n\n");
    }

    protected void classEnd() {
        indent();
        sb.append("}\n\n");
    }

    protected void addLibraries(String[] libraryNames) {
        incrAlign();
        indent();
        sb.append(PRI_MODS + "LibraryLookup[] LIBRARIES = RuntimeHelper.libraries(");
        sb.append(stringArray(libraryNames) + ");\n");
        decrAlign();
    }

    private String stringArray(String[] elements) {
        return Stream.of(elements)
                .map(n -> "\"" + n + "\"")
                .collect(Collectors.joining(",", "new String[] {", "}"));
    }

    protected void addLayout(String elementName, MemoryLayout layout) {
        incrAlign();
        indent();
        sb.append(PUB_MODS + "MemoryLayout " + elementName + "$LAYOUT = ");
        addLayout(layout);
        sb.append(";\n");
        decrAlign();
    }

    private void addLayout(MemoryLayout l) {
        if (l instanceof ValueLayout) {
            SystemABI.Type type = l.abiType().orElseThrow(()->new AssertionError("Should not get here: " + l));
            sb.append(switch (type) {
                case BOOL -> "C_BOOL";
                case SIGNED_CHAR -> "C_SCHAR";
                case UNSIGNED_CHAR -> "C_UCHAR";
                case CHAR -> "C_CHAR";
                case SHORT -> "C_SHORT";
                case UNSIGNED_SHORT -> "C_USHORT";
                case INT -> "C_INT";
                case UNSIGNED_INT -> "C_UINT";
                case LONG -> "C_LONG";
                case UNSIGNED_LONG -> "C_ULONG";
                case LONG_LONG -> "C_LONGLONG";
                case UNSIGNED_LONG_LONG -> "C_ULONGLONG";
                case FLOAT -> "C_FLOAT";
                case DOUBLE -> "C_DOUBLE";
                case LONG_DOUBLE -> "C_LONGDOUBLE";
                case POINTER -> "C_POINTER";
                default -> { throw new RuntimeException("should not reach here: " + type); }
            });
        } else if (l instanceof SequenceLayout) {
            sb.append("MemoryLayout.ofSequence(");
            if (((SequenceLayout) l).elementCount().isPresent()) {
                sb.append(((SequenceLayout) l).elementCount().getAsLong() + ", ");
            }
            addLayout(((SequenceLayout) l).elementLayout());
            sb.append(")");
        } else if (l instanceof GroupLayout) {
            SystemABI.Type type = l.abiType().orElse(null);
            if (type == SystemABI.Type.COMPLEX_LONG_DOUBLE) {
                if (!ABI.equals(SystemABI.ABI_SYSV)) {
                    throw new RuntimeException("complex long double is supported only for SysV ABI");
                } else {
                    sb.append("C_COMPLEX_LONGDOUBLE");
                }
            } else {
                if (((GroupLayout) l).isStruct()) {
                    sb.append("MemoryLayout.ofStruct(\n");
                } else {
                    sb.append("MemoryLayout.ofUnion(\n");
                }
                incrAlign();
                String delim = "";
                for (MemoryLayout e : ((GroupLayout) l).memberLayouts()) {
                    sb.append(delim);
                    indent();
                    addLayout(e);
                    delim = ",\n";
                }
                sb.append("\n");
                decrAlign();
                indent();
                sb.append(")");
            }
        } else {
            //padding
            sb.append("MemoryLayout.ofPaddingBits(" + l.bitSize() + ")");
        }
        if (l.name().isPresent()) {
            sb.append(".withName(\"" +  l.name().get() + "\")");
        }
    }

    protected void addVarHandle(String name, Class<?> type, String parentName) {
        incrAlign();
        indent();
        String vhName = parentName != null ?
                parentName + "$" + name :
                name;
        sb.append(PUB_MODS + "VarHandle " + vhName + " = ");
        if (parentName != null) {
            addHandlePath(type, parentName, name);
        } else {
            addHandlePath(type, name);
        }
        sb.append(";\n");
        decrAlign();
    }

    protected void addHandlePath(Class<?> type, String strName, String fieldName) {
        String ty = type.getName();
        if (ty.contains("MemoryAddress")) {
            ty = "long";
        }
        sb.append(strName + "$LAYOUT.varHandle(" + ty + ".class, ");
        sb.append("PathElement.groupElement(\"" + fieldName +"\")");
        sb.append(")");
    }

    protected void addHandlePath(Class<?> type, String varName) {
        String ty = type.getName();
        if (ty.contains("MemoryAddress")) {
            ty = "long";
        }
        sb.append(varName + "$LAYOUT.varHandle(" + ty + ".class)");
    }

    protected void addMethodHandle(Declaration.Function funcTree, MethodType mtype, FunctionDescriptor desc) {
        incrAlign();
        indent();
        sb.append(PUB_MODS + "MethodHandle " + funcTree.name() + " = ");
        sb.append("RuntimeHelper.downcallHandle(\n");
        incrAlign();
        indent();
        sb.append("LIBRARIES, \"" + funcTree.name() + "\"");
        sb.append(",\n");
        indent();
        sb.append("\"" + mtype.toMethodDescriptorString() + "\",\n");
        indent();
        addFunction(desc);
        sb.append(",\n");
        indent();
        sb.append(funcTree.type().varargs());
        decrAlign();
        sb.append("\n");
        indent();
        sb.append(");\n");
        decrAlign();
    }

    protected void addAddressLookup(String name) {
        sb.append("RuntimeHelper.lookupGlobalVariable(LIBRARIES, \"" + name + "\")");
    }

    private void addFunction(FunctionDescriptor f) {
        if (f.returnLayout().isPresent()) {
            sb.append("FunctionDescriptor.of(");
            addLayout(f.returnLayout().get());
            sb.append(", ");
        } else {
            sb.append("FunctionDescriptor.ofVoid(");
        }
        if (!f.argumentLayouts().isEmpty()) {
            sb.append("\n");
            incrAlign();
            String delim = "";
            for (MemoryLayout e : f.argumentLayouts()) {
                sb.append(delim);
                indent();
                addLayout(e);
                delim = ",\n";
            }
            sb.append("\n");
            decrAlign();
            indent();
        }
        sb.append(")");
    }

    protected void addAddress(String name) {
        incrAlign();
        indent();
        sb.append(PUB_MODS + "MemoryAddress " + name + "$ADDR" + " = ");
        addAddressLookup(name);
        sb.append(";\n");
        decrAlign();
    }

    protected void addConstant(String name, Class<?> type, Object value) {
        incrAlign();
        indent();
        if (type == MemoryAddress.class || type == MemorySegment.class) {
            //todo, skip for now (address constants and string constants)
        } else {
            sb.append(PUB_MODS + type.getName() + " " + name);
            sb.append(" = ");
            if (type == float.class) {
                sb.append(value);
                sb.append("f");
            } else if (type == long.class) {
                sb.append(value);
                sb.append("L");
            } else if (type == double.class) {
                sb.append(value);
                sb.append("d");
            } else {
                sb.append("(" + type.getName() + ")");
                sb.append(value + "L");
            }
            sb.append(";\n");
        }

        decrAlign();
    }

    static int funcIntfCounter = 0;

    protected void addUpcallFactory(FunctionDescriptor desc) {
        String fnName = "FI" + funcIntfCounter++;
        incrAlign();
        indent();
        sb.append(PRI_MODS + "FunctionDescriptor " + fnName + "$DESC = ");
        addFunction(desc);
        sb.append(";\n");
        indent();
        sb.append(PUB_MODS + "MemoryAddress " + fnName + "$make(MethodHandle handle) {\n");
        incrAlign();
        indent();
        sb.append("return RuntimeHelper.upcallStub(handle, " + fnName + "$DESC);\n");
        decrAlign();
        indent();
        sb.append("}\n");
        decrAlign();
    }

    protected void addStaticFunctionWrapper(Declaration.Function f, MethodType mtype) {
        incrAlign();
        indent();
        sb.append(PUB_MODS + mtype.returnType().getName() + " " + f.name() + " (");
        String delim = "";
        List<String> pNames = new ArrayList<>();
        final int numParams = f.parameters().size();
        for (int i = 0 ; i < numParams; i++) {
            String pName = f.parameters().get(i).name();
            if (pName.isEmpty()) {
                pName = "x" + i;
            }
            pNames.add(pName);
            sb.append(delim + mtype.parameterType(i).getName() + " " + pName);
            delim = ", ";
        }
        if (f.type().varargs()) {
            String lastArg = "x" + numParams;
            if (numParams > 0) {
                sb.append(", ");
            }
            sb.append("Object... " + lastArg);
            pNames.add(lastArg);
        }
        sb.append(") {\n");
        incrAlign();
        indent();
        sb.append("try {\n");
        incrAlign();
        indent();
        if (!mtype.returnType().equals(void.class)) {
            sb.append("return (" + mtype.returnType().getName() + ")");
        }
        sb.append(f.name() + ".invokeExact(" + String.join(", ", pNames) + ");\n");
        decrAlign();
        indent();
        sb.append("} catch (Throwable ex) {\n");
        incrAlign();
        indent();
        sb.append("throw new AssertionError(ex);\n");
        decrAlign();
        indent();
        sb.append("}\n");
        decrAlign();
        indent();
        sb.append("}\n");
        decrAlign();
    }

    void addDescriptor(String name, FunctionDescriptor desc) {
        incrAlign();
        indent();
        sb.append(PRI_MODS + "FunctionDescriptor " + name + "$DESC = ");
        addFunction(desc);
        sb.append(";\n");
        decrAlign();
        indent();
    }

    void addFunctionalInterface(String name, MethodType mtype) {
        incrAlign();
        indent();
        sb.append("public interface " + name + " {\n");
        incrAlign();
        indent();
        sb.append(mtype.returnType().getName() + " apply(");
        String delim = "";
        for (int i = 0 ; i < mtype.parameterCount() ; i++) {
            sb.append(delim + mtype.parameterType(i).getName() + " x" + i);
            delim = ", ";
        }
        sb.append(");\n");
        decrAlign();
        indent();
        sb.append("}\n");
        decrAlign();
        indent();
    }

    protected void addFunctionalFactory(String name, MethodType mtype) {
        incrAlign();
        indent();
        sb.append(PUB_MODS + "MemoryAddress " + name + "$make(" + name + " fi) {\n");
        incrAlign();
        indent();
        sb.append("return RuntimeHelper.upcallStub(" + name + ".class, fi, " + name + "$DESC, " +
                "\"" + mtype.toMethodDescriptorString() + "\");\n");
        decrAlign();
        indent();
        sb.append("}\n");
        decrAlign();
    }

    void addGetter(String name, Class<?> type, Declaration parent) {
        incrAlign();
        indent();
        String vhName = (parent != null ? (parent.name() + "$") : "") + name;
        String param = parent != null ? (MemorySegment.class.getName() + " seg") : "";
        sb.append(PUB_MODS + type.getName() + " " + vhName + "$get(" + param + ") {\n");
        incrAlign();
        indent();
        String vhParam = parent != null ?
                "seg.baseAddress()" : name + "$ADDR";
        sb.append("return (" + type.getName() + ")" + vhName + ".get(" + vhParam + ");\n");
        decrAlign();
        indent();
        sb.append("}\n");
        decrAlign();
    }

    void addSetter(String name, Class<?> type, Declaration parent) {
        incrAlign();
        indent();
        String vhName = (parent != null ? (parent.name() + "$") : "") + name;
        String param = parent != null ? (MemorySegment.class.getName() + " seg, ") : "";
        sb.append(PUB_MODS + "void " + vhName + "$set(" + param + type.getName() + " x) {\n");
        incrAlign();
        indent();
        String vhParam = parent != null ?
                "seg.baseAddress()" : name + "$ADDR";
        sb.append(vhName + ".set(" + vhParam + ", x);\n");
        decrAlign();
        indent();
        sb.append("}\n");
        decrAlign();
    }

    protected String build() {
        String res = sb.toString();
        this.sb = null;
        return res.toString();
    }

    protected void indent() {
        for (int i = 0; i < align; i++) {
            sb.append("    ");
        }
    }

    protected void incrAlign() {
        align++;
    }

    protected void decrAlign() {
        align--;
    }
}

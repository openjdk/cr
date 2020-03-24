/*
 * Copyright (c) 2020, Oracle and/or its affiliates. All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.
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

/*
 * @test
 * @build JextractApiTestBase
 * @run testng/othervm -ea TestDepth
 */

import java.io.ByteArrayOutputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;

import jdk.incubator.foreign.MemoryLayouts;
import jdk.incubator.jextract.Declaration;
import jdk.incubator.jextract.Position;
import jdk.incubator.jextract.Type;
import org.testng.annotations.Test;
import static org.testng.Assert.*;

public class TestDepth extends JextractApiTestBase {
    private final static Type C_INT = Type.primitive(Type.Primitive.Kind.Int, MemoryLayouts.C_INT);
    // We need stdint.h for pointer macro, otherwise evaluation failed and Constant declaration is not created
    String BUILTIN_INCLUDE = Paths.get(System.getProperty("java.home"), "conf", "jextract").toString();

    private void assertOrigin(Position target, String filename, int depth) {
        assertTrue(target.origin().path().endsWith(filename));
        assertEquals(target.depth(), depth);
    }

    private String getSysRoot() {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Process xcrun = new ProcessBuilder("xcrun", "--show-sdk-path").start();
            xcrun.waitFor();
            xcrun.getInputStream().transferTo(output);
            String sysroot = output.toString();
            // Trim tailing \n
            sysroot = sysroot.substring(0, sysroot.length() - 1);
            return sysroot;
        } catch (Throwable t) {
            t.printStackTrace();
            return "";
        }
    }

    @Test
    public void parseEmpty() {
        Declaration.Scoped root = parse("empty.h");
        assertTrue(root.members().isEmpty());
    }

    @Test
    public void parseMacFramework() {
        if (!isMacOSX) {
            return;
        }

        Declaration.Scoped root = parse("macos.h", "-isysroot", getSysRoot(), "-I", BUILTIN_INCLUDE);
        // FIXME: kCFNotFound is not generated
        // static const CFIndex kCFNotFound = -1;
        Declaration.Constant cf = checkConstant(root, "__COREFOUNDATION_CFBASE__", C_INT, 1L);
        assertTrue(cf.pos().path().endsWith("CFBase.h"));
        assertOrigin(cf.pos(), "CoreFoundation.h", 3);
    }

    @Test
    public void parseDepth1() {
        Declaration.Scoped root = parse("depth1.h", "-I", BUILTIN_INCLUDE);
        Declaration.Function fn = checkFunction(root, "depth1", C_INT);
        assertEquals(fn.pos().origin(), Position.NO_POSITION);
        assertEquals(fn.pos().depth(), 1);

        fn = checkFunction(root, "depth2", C_INT);
        assertOrigin(fn.pos(), "depth1.h", 2);

        Declaration.Variable global = checkGlobal(root, "depth2and3", C_INT);
        assertOrigin(global.pos(), "depth1.h", 2);

        global = checkGlobal(root, "foo", C_INT);
        assertTrue(global.pos().path().endsWith("libAsmSymbol.h"));
        assertOrigin(global.pos(), "depth2.h", 3);

        Declaration.Constant zero = checkConstant(root, "ZERO", C_INT, 0L);
        assertTrue(zero.pos().path().endsWith("smoke.h"));
        assertOrigin(zero.pos(), "depth2and3.h", 3);
    }
}

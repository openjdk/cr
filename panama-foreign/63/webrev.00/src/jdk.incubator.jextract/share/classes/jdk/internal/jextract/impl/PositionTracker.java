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
 *
 */

package jdk.internal.jextract.impl;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Map;
import java.util.Objects;
import java.util.function.Supplier;
import jdk.incubator.jextract.Position;
import jdk.internal.clang.Cursor;
import jdk.internal.clang.CursorKind;
import jdk.internal.clang.SourceLocation;

public class PositionTracker {
    // The included source path map to the shallowest position of include directive
    private final Map<Path, Origin> origins = new HashMap<>();
    // The partial path from the include directive to resolved path by clang
    private final Map<String, Path> realPaths = new HashMap<>();
    // The chain of include directive leads to current file, not include current file
    private LinkedList<Path> stack;
    // The position of the latest include directive
    private Origin pending = null;
    // The file to be included next, used to resolve the real path
    private String file = null;
    private boolean preprocessing;

    private static final boolean isMacOS = System.getProperty("os.name", "").contains("OS X");
    private static final boolean DEBUG = System.getProperty("position.debug", "false").equals("true");

    private void debug(Supplier<String> msg){
        if (DEBUG) {
            System.out.println(msg.get());
        }
    }
    private void debug(String msg){
        if (DEBUG) {
            System.out.println(msg);
        }
    }

    private String currentStack() {
        StringBuilder sb = new StringBuilder();
        sb.append("New include: ").append(file).append("\n");
        for (int i = stack.size() - 1; i >= 0; i--) {
            Path tmp = stack.get(i);
            for (int j = i + 1; j < stack.size() ; j++) sb.append(' ');
            sb.append(tmp);
            sb.append("\n");
        }
        return sb.toString();
    }

    private String showOrigins() {
        StringBuilder sb = new StringBuilder();
        sb.append("Current origins table:\n");
        origins.entrySet().stream().forEach(e -> {
            sb.append(e.getKey());
            sb.append(" -> ");
            sb.append(e.getValue());
            sb.append("\n");
        });
        return sb.toString();
    }

    static class Origin {
        private final Position pos;
        private final int depth;
        final static Origin TOP = new Origin(0, Position.NO_POSITION);

        Origin(int depth, Position pos) {
            this.depth = depth;
            this.pos = pos;
        }

        boolean deeperThan(Origin other) {
            return depth >= other.depth;
        }

        @Override
        public String toString() {
            return String.format("%s@%d", pos.toString(), depth);
        }
    }

    public void start(Path root) {
        preprocessing = true;
        stack = new LinkedList<>();
        pending = Origin.TOP;
        file = root.toString();
    }

    private int setOrigin(Path path, Origin origin) {
        Objects.requireNonNull(path);
        Objects.requireNonNull(origin);
        Origin existing = origins.get(path);
        if (null != existing) {
            // Update existing postion if this is closer to the top
            if (origin.deeperThan(existing)) {
                debug(String.format(
                    "Ignore %s from %s is deeper than existing %s", path.toString(), origin.toString(), existing.toString()));
                return existing.depth;
            } else {
                debug(String.format("Update %s origin to %s from %s",
                    path.toString(), origin.toString(), existing.toString()));
            }
        } else {
            debug(String.format("Set %s origin to %s", path.toString(), origin.toString()));
        }
        origins.put(path, origin);
        return origin.depth;
    }

    private boolean pathEndsWithFile(Path fullpath, String subpath) {
        if (fullpath.endsWith(subpath)) {
            return true;
        }
        if (isMacOS) {
            // https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPFrameworks/Concepts/FrameworkAnatomy.html
            // The system identifies a framework by the .framework extension on its directory name
            Path target = Paths.get(subpath);
            return (target.getNameCount() > 1 &&
                    fullpath.endsWith(target.subpath(1, target.getNameCount())) &&
                    fullpath.toString().contains(target.getName(0).toString() + ".framework"));
        }
        return false;
    }

    private Position getOrigin(Path p) {
        return (p == null) ? Position.NO_POSITION : origins.getOrDefault(p, Origin.TOP).pos;
    }

    private void reconcileStack(Path current) {
        int index = stack.indexOf(current);
        if (pending != null && pathEndsWithFile(current, file)) {
            if (index == -1) {
                stack.push(current);
                realPaths.put(file, current);
                setOrigin(current, pending);
            } else {
                debug("Circular inclusion detected");
                debug(this::currentStack);
                debug(this::showOrigins);
                assert origins.get(current).depth == (stack.size() - index - 1);
                // ignore this one, as whatever comes in in the file will be same and deeper then earlier
                // when go back up, the stack will be reconcile properly
            }
            pending = null;
        } else if (pending != null) {
            // Not from the included file, meaning the included file procduce no cursor during preprocessing
            debug("Expecting " + file + ", but get " + current);
            // Trying to figure out real path of the included file, the stack could be shorter
            Path tmp = realPaths.get(file);
            if (tmp != null) {
                setOrigin(tmp, pending);
            } else {
                debug("Don't know the real path for include file: " + file);
            }
            pending = null;
        }
        assert pending == null;

        if (index > 0) {
            // rewind stack
            stack.subList(0, index).clear();
            debug("Roll back stack to " + stack.get(0));
            debug(this::currentStack);
        }
    }

    public int track(Cursor cursor) {
        SourceLocation.Location loc;
        try {
            loc = cursor.getSourceLocation().getFileLocation();
        } catch (NullPointerException npe) {
            // Ignore cursor without location
            return 0;
        }
        assert (loc != null);
        Path current = loc.path();
        if (current == null) {
            // Built-in macro instantiation
            assert stack.isEmpty();
            return 0;
        }

        if (cursor.isDeclaration()) {
            if (preprocessing) {
                // Preprocessing is done, we should have depth figured out
                // unless there is no #include at all, this is the file
                if (origins.isEmpty()) {
                    setOrigin(current, Origin.TOP);
                    return 1;
                }
                debug(this::showOrigins);
                preprocessing = false;
            }
            assert origins.get(current) != null : "Cannot find origin for " + current;
            return origins.get(current).depth;
        }

        // Make sure current file is the top of stack
        reconcileStack(current);

        if (cursor.kind() == CursorKind.InclusionDirective) {
            pending = new Origin(stack.size(), toPos(cursor));
            file = cursor.spelling();
            debug(this::currentStack);
        }
        return stack.size();
    }

    public Position toPos(Cursor cursor) {
        SourceLocation loc = cursor.getSourceLocation();
        if (loc == null) {
            return Position.NO_POSITION;
        }
        SourceLocation.Location sloc = loc.getFileLocation();
        if (sloc == null) {
            return Position.NO_POSITION;
        }
        return new CursorPosition(cursor, this::getOrigin);
    }
}

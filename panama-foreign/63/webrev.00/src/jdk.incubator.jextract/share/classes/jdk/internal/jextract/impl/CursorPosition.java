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
import java.util.function.Function;
import java.util.Objects;
import jdk.internal.clang.Cursor;
import jdk.internal.clang.SourceLocation;
import jdk.incubator.jextract.Position;

final class CursorPosition implements Position {
    private final Cursor cursor;
    private final Path path;
    private final int line;
    private final int column;
    private final Function<Path, Position> whereFrom;

    CursorPosition(Cursor cursor, Function<Path, Position> whereFrom) {
        Objects.requireNonNull(cursor);
        SourceLocation.Location loc = cursor.getSourceLocation().getFileLocation();
        this.cursor = cursor;
        this.path = loc.path();
        this.line = loc.line();
        this.column = loc.column();
        this.whereFrom = whereFrom;
    }

    @Override
    public Path path() { return path; }

    @Override
    public int line() { return line; }

    @Override
    public int col() { return column; }

    @Override
    public Position origin() {
        return whereFrom.apply(path);
    }

    public Cursor cursor() { return cursor; }

    @Override
    public String toString() {
        return PrettyPrinter.position(this);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this);
    }

    @Override
    public boolean equals(Object o) {
        if (o instanceof CursorPosition) {
            CursorPosition other = (CursorPosition) o;
            return (path().equals(other.path()) && line() == other.line() && col() == other.col()
                    && origin().equals(other.origin()));
        }
        return false;
    }
}

/*
 * Copyright (C) 2015-2016 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#pragma once

#if ENABLE(B3_JIT)

#include "B3Value.h"

namespace JSC { namespace B3 {

class JS_EXPORT_PRIVATE ConstDoubleValue : public Value {
public:
    static bool accepts(Kind kind) { return kind == ConstDouble; }

    ~ConstDoubleValue();

    double value() const { return m_value; }

    Value* negConstant(Procedure&) const override;
    Value* addConstant(Procedure&, int32_t other) const override;
    Value* addConstant(Procedure&, const Value* other) const override;
    Value* subConstant(Procedure&, const Value* other) const override;
    Value* divConstant(Procedure&, const Value* other) const override;
    Value* modConstant(Procedure&, const Value* other) const override;
    Value* mulConstant(Procedure&, const Value* other) const override;
    Value* bitAndConstant(Procedure&, const Value* other) const override;
    Value* bitOrConstant(Procedure&, const Value* other) const override;
    Value* bitXorConstant(Procedure&, const Value* other) const override;
    Value* bitwiseCastConstant(Procedure&) const override;
    Value* doubleToFloatConstant(Procedure&) const override;
    Value* absConstant(Procedure&) const override;
    Value* ceilConstant(Procedure&) const override;
    Value* floorConstant(Procedure&) const override;
    Value* sqrtConstant(Procedure&) const override;

    TriState equalConstant(const Value* other) const override;
    TriState notEqualConstant(const Value* other) const override;
    TriState lessThanConstant(const Value* other) const override;
    TriState greaterThanConstant(const Value* other) const override;
    TriState lessEqualConstant(const Value* other) const override;
    TriState greaterEqualConstant(const Value* other) const override;
    TriState equalOrUnorderedConstant(const Value* other) const override;

    B3_SPECIALIZE_VALUE_FOR_NO_CHILDREN

private:
    friend class Procedure;
    friend class Value;

    void dumpMeta(CommaPrinter&, PrintStream&) const override;

    static Opcode opcodeFromConstructor(Origin, double) { return ConstDouble; }

    ConstDoubleValue(Origin origin, double value)
        : Value(CheckedOpcode, ConstDouble, Double, Zero, origin)
        , m_value(value)
    {
    }

    double m_value;
};

} } // namespace JSC::B3

#endif // ENABLE(B3_JIT)

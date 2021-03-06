// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import makeAmountMath from '../../../src/amountMath';

// The "unit tests" for MathHelpers actually make the calls through
// AmountMath so that we can test that any duplication is handled
// correctly.

const mockBrand = harden({
  isMyIssuer: () => false,
  allegedName: () => 'mock',
});

const amountMath = makeAmountMath(mockBrand, 'nat');

test('natMathHelpers', t => {
  try {
    const {
      getBrand,
      getMathHelpersName,
      make,
      coerce,
      getExtent,
      getEmpty,
      isEmpty,
      isGTE,
      isEqual,
      add,
      subtract,
    } = amountMath;

    // getBrand
    t.deepEquals(getBrand(), mockBrand, 'brand is brand');

    // getMathHelpersName
    t.deepEquals(getMathHelpersName(), 'nat', 'mathHelpersName is nat');

    // make
    t.deepEquals(make(4), { brand: mockBrand, extent: 4 });
    t.throws(
      () => make('abc'),
      /RangeError: not a safe integer/,
      `'abc' is not a nat`,
    );
    t.throws(() => make(-1), /RangeError: negative/, `- 1 is not a valid Nat`);

    // coerce
    t.deepEquals(
      coerce(harden({ brand: mockBrand, extent: 4 })),
      {
        brand: mockBrand,
        extent: 4,
      },
      `coerce can take an amount`,
    );
    t.throws(
      () => coerce(harden({ brand: {}, extent: 4 })),
      /Unrecognized brand/,
      `coerce can't take the wrong brand`,
    );
    t.throws(
      () => coerce(3),
      /alleged brand is undefined/,
      `coerce needs a brand`,
    );

    // getExtent
    t.equals(getExtent(make(4)), 4);

    // getEmpty
    t.deepEquals(getEmpty(), make(0), `empty is 0`);

    // isEmpty
    t.ok(isEmpty({ brand: mockBrand, extent: 0 }), `isEmpty(0) is true`);
    t.notOk(isEmpty({ brand: mockBrand, extent: 6 }), `isEmpty(6) is false`);
    t.ok(isEmpty(make(0)), `isEmpty(0) is true`);
    t.notOk(isEmpty(make(6)), `isEmpty(6) is false`);
    t.throws(
      () => isEmpty('abc'),
      /alleged brand is undefined/,
      `isEmpty('abc') throws because it cannot be coerced`,
    );
    t.throws(
      () => isEmpty({ brand: mockBrand, extent: 'abc' }),
      /RangeError: not a safe integer/,
      `isEmpty('abc') throws because it cannot be coerced`,
    );
    t.throws(
      () => isEmpty(0),
      /alleged brand is undefined/,
      `isEmpty(0) throws because it cannot be coerced`,
    );

    // isGTE
    t.ok(isGTE(make(5), make(3)), `5 >= 3`);
    t.ok(isGTE(make(3), make(3)), `3 >= 3`);
    t.notOk(
      isGTE({ brand: mockBrand, extent: 3 }, { brand: mockBrand, extent: 4 }),
      `3 < 4`,
    );

    // isEqual
    t.ok(isEqual(make(4), make(4)), `4 equals 4`);
    t.notOk(isEqual(make(4), make(5)), `4 does not equal 5`);

    // add
    t.deepEquals(add(make(5), make(9)), make(14), `5 + 9 = 14`);

    // subtract
    t.deepEquals(subtract(make(6), make(1)), make(5), `6 - 1 = 5`);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

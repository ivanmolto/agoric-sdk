import harden from '@agoric/harden';

import produceIssuer from '@agoric/ertp';

const setup = () => {
  const moolaBundle = produceIssuer('moola');
  const simoleanBundle = produceIssuer('simoleans');
  const bucksBundle = produceIssuer('bucks');
  const allBundles = {
    moola: moolaBundle,
    simoleans: simoleanBundle,
    bucks: bucksBundle,
  };
  const amountMaths = new Map();
  const brands = new Map();

  for (const k of Object.getOwnPropertyNames(allBundles)) {
    amountMaths.set(k, allBundles[k].amountMath);
    brands.set(k, allBundles[k].brand);
  }

  return harden({
    moolaIssuer: moolaBundle.issuer,
    moolaMint: moolaBundle.mint,
    moolaR: moolaBundle,
    simoleanIssuer: simoleanBundle.issuer,
    simoleanMint: simoleanBundle.mint,
    simoleanR: simoleanBundle,
    bucksIssuer: bucksBundle.issuer,
    bucksMint: bucksBundle.mint,
    bucksR: bucksBundle,
    amountMaths,
    brands,
    moola: moolaBundle.amountMath.make,
    simoleans: simoleanBundle.amountMath.make,
    bucks: bucksBundle.amountMath.make,
  });
};
harden(setup);
export { setup };

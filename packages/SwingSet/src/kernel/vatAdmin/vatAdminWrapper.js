/**
 * The VatAdmin wrapper vat.
 *
 * This is the only vat that has a direct pointer to the vatAdmin device, so it
 * must ensure that only data goes in and out. It's also responsible for turning
 * device affordances into objects that can be used by code in other vats.
 */
import harden from '@agoric/harden';
import { producePromise } from '@agoric/produce-promise';

export default function setup(syscall, state, helpers) {
  function build(E, D) {
    const vatIdsToResolvers = new Map();

    function createVatAdminService(vatAdminNode) {
      return harden({
        createVat(code) {
          const { vatID, error } = D(vatAdminNode).create(code);
          if (error) {
            throw Error(`Vat Creation Error: ${error}`);
          } else {
            const vatPromise = producePromise();
            vatIdsToResolvers.set(vatID, vatPromise.resolve);
            const adminNode = harden({
              terminate() {
                D(vatAdminNode).terminate(vatID);
                // TODO(hibbert): cleanup admin vat data structures
              },
              adminData() {
                return D(vatAdminNode).adminStats(vatID);
              },
            });
            return vatPromise.promise.then(root => {
              return { adminNode, root };
            });
          }
        },
      });
    }

    function newVatCallback(vatId, rootObject) {
      const rootResolver = vatIdsToResolvers.get(vatId);
      vatIdsToResolvers.delete(vatId);
      rootResolver(rootObject);
    }

    return harden({
      createVatAdminService,
      newVatCallback,
    });
  }

  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}

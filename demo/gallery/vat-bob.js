// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { makeCollect } from '../../core/contractHost';

let storedExclusivePayment;

function makeBobMaker(E, log) {
  return harden({
    make(gallery) {
      const bob = harden({
        /**
         * This is not an imperative to Bob to buy something but rather
         * the opposite. It is a request by a client to buy something from
         * Bob, and therefore a request that Bob sell something. OO naming
         * is a bit confusing here.
         */
        async receiveUseRight(useRightPaymentP) {
          log('++ bob.receiveUseRight starting');

          const { useRightIssuer } = await E(gallery).getIssuers();
          const useRightPurse = E(useRightIssuer).makeEmptyPurse();
          // TODO: does bob know the amount that he is getting?
          // use getExclusive() instead
          const exclusiveUseRightPaymentP = E(useRightIssuer).getExclusiveAll(
            useRightPaymentP,
          );

          // putting it in a purse isn't useful but it allows us to
          // test the functionality
          await E(useRightPurse).depositAll(exclusiveUseRightPaymentP);
          const payment = await E(useRightPurse).withdrawAll();

          const exclusivePayment = await E(useRightIssuer).getExclusiveAll(
            payment,
          );

          // bob actually changes the color to light purple
          const amountP = await E(gallery).changeColor(
            exclusivePayment,
            '#B695C0',
          );

          storedExclusivePayment = exclusivePayment;
          return amountP;
        },
        async tryToColor() {
          // bob tries to change the color to light purple
          const amountP = await E(gallery).changeColor(
            storedExclusivePayment,
            '#B695C0',
          );
          return amountP;
        },
        async buyFromCorkBoard(handoffSvc, dustPurseP) {
          const { pixelIssuer, dustIssuer, useRightIssuer } = await E(
            gallery,
          ).getIssuers();
          const collect = makeCollect(E, log);
          const boardP = E(handoffSvc).grabBoard('MeetPoint');
          const contractHostP = E(boardP).lookup('contractHost');
          const buyerInviteP = E(boardP).lookup('buyerSeat');
          const buyerSeatP = E(contractHostP).redeem(buyerInviteP);

          const pixelPurseP = E(pixelIssuer).makeEmptyPurse('purchase');
          E(buyerSeatP).offer(dustPurseP);
          const dustRefundP = E(dustIssuer).makeEmptyPurse('dust refund');
          await collect(buyerSeatP, pixelPurseP, dustRefundP, 'bob option');

          const exclusivePayment = await E(pixelIssuer).getExclusiveAll(
            pixelPurseP,
          );

          const { useRightPayment } = await E(gallery).split(exclusivePayment);
          const exclusiveUseRightPaymentP = E(useRightIssuer).getExclusiveAll(
            useRightPayment,
          );
          // bob tries to change the color to light purple
          E(gallery)
            .changeColor(exclusiveUseRightPaymentP, '#B695C0')
            .then(
              amountP => {
                E(gallery)
                  .getColor(amountP.quantity[0].x, amountP.quantity[0].y)
                  .then(color =>
                    log(`bob tried to color, and produced ${color}`),
                  );
              },
              rej => log('++ bob failed to color: ', rej),
            );
          return { bobRefundP: dustRefundP, bobPixelP: exclusivePayment };
        },
      });
      return bob;
    },
  });
}

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeBobMaker() {
        return harden(makeBobMaker(E, log));
      },
    }),
  );
}
export default harden(setup);
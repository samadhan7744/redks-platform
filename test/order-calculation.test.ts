import assert from 'node:assert/strict';
import { OrderCalculationService } from '../src/modules/orders/order-calculation.service';

const calculator = new OrderCalculationService();

const result = calculator.calculate({
  items: [
    { quantity: 2, unitPrice: 50 },
    { quantity: 1, unitPrice: 25 },
  ],
  deliveryFee: 30,
  platformFee: 5,
  discountAmount: 10,
  commissionPercent: 8,
});

assert.deepEqual(result, {
  subtotal: 125,
  deliveryFee: 30,
  platformFee: 5,
  discountAmount: 10,
  commissionPercent: 8,
  commissionAmount: 10,
  totalAmount: 150,
});

console.log('order calculation tests passed');

import { Injectable } from '@nestjs/common';

export type OrderCalculationInput = {
  items: Array<{ quantity: number; unitPrice: number }>;
  deliveryFee?: number;
  platformFee?: number;
  discountAmount?: number;
  commissionPercent?: number;
};

@Injectable()
export class OrderCalculationService {
  calculate(input: OrderCalculationInput) {
    const subtotal = input.items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0,
    );
    const deliveryFee = input.deliveryFee ?? 0;
    const platformFee = input.platformFee ?? 0;
    const discountAmount = input.discountAmount ?? 0;
    const commissionPercent = input.commissionPercent ?? 0;
    const commissionAmount = Number(
      ((subtotal * commissionPercent) / 100).toFixed(2),
    );
    const totalAmount = Number(
      (subtotal + deliveryFee + platformFee - discountAmount).toFixed(2),
    );

    return {
      subtotal: Number(subtotal.toFixed(2)),
      deliveryFee,
      platformFee,
      discountAmount,
      commissionPercent,
      commissionAmount,
      totalAmount,
    };
  }
}

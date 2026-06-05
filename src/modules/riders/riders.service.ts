import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  RiderAvailabilityStatus,
  RiderStatus,
  UserRole,
  VerificationDocumentOwnerType,
} from '@prisma/client';
import { ok } from '../../common/utils/api-response.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRiderDocumentDto } from './dto/create-rider-document.dto';
import { CreateRiderProfileDto } from './dto/create-rider-profile.dto';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
import { UpdateRiderAvailabilityStatusDto } from './dto/update-rider-availability-status.dto';

@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: string, dto: CreateRiderProfileDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const roles = Array.from(new Set([...user.roles, UserRole.RIDER]));
    await this.prisma.user.update({
      where: { id: userId },
      data: { roles, name: dto.fullName, email: dto.email ?? user.email },
    });

    const profile = await this.prisma.riderProfile.upsert({
      where: { userId },
      update: {
        ...this.toProfileData(dto),
        status: RiderStatus.SUBMITTED,
        submittedAt: new Date(),
        rejectionReason: null,
        reviewNotes: null,
      },
      create: {
        ...this.toProfileData(dto),
        userId,
        cityId: dto.cityId,
        status: RiderStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: this.include(),
    });
    return ok(profile, 'Rider profile submitted for approval');
  }

  async me(userId: string) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      include: this.include(),
    });
    if (!profile) throw new NotFoundException('Rider profile not found');
    return ok(profile);
  }

  async updateMe(userId: string, dto: UpdateRiderProfileDto) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Rider profile not found');
    const updated = await this.prisma.riderProfile.update({
      where: { id: profile.id },
      data: {
        ...this.toProfileData(dto),
        status:
          profile.status === RiderStatus.REJECTED ||
          profile.status === RiderStatus.CHANGES_REQUESTED
            ? RiderStatus.SUBMITTED
            : undefined,
        submittedAt: new Date(),
      },
      include: this.include(),
    });
    return ok(updated, 'Rider profile updated');
  }

  async updateAvailabilityStatus(
    userId: string,
    dto: UpdateRiderAvailabilityStatusDto,
  ) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Rider profile not found');
    if (profile.status !== RiderStatus.APPROVED) {
      throw new BadRequestException(
        'Rider must be approved before going online',
      );
    }
    const availabilityStatus = this.normalizeAvailability(dto.status);
    return ok(
      await this.prisma.riderProfile.update({
        where: { id: profile.id },
        data: {
          availabilityStatus,
          lastAvailableAt:
            availabilityStatus === RiderAvailabilityStatus.ONLINE
              ? new Date()
              : undefined,
        },
        include: this.include(),
      }),
      'Rider availability status updated',
    );
  }

  async available() {
    return ok(
      await this.prisma.riderProfile.findMany({
        where: {
          status: RiderStatus.APPROVED,
          availabilityStatus: {
            in: [
              RiderAvailabilityStatus.ONLINE,
              RiderAvailabilityStatus.AVAILABLE,
            ],
          },
        },
        include: {
          user: true,
          city: true,
          zone: true,
          assignedOrders: {
            where: {
              status: {
                in: [
                  OrderStatus.ASSIGNED,
                  OrderStatus.PICKED_UP,
                  OrderStatus.OUT_FOR_DELIVERY,
                ],
              },
            },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  async submit(userId: string) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Rider profile not found');
    if (!profile.fullName || !profile.phone || !profile.cityId) {
      throw new BadRequestException(
        'fullName, phone, and city are required before submission',
      );
    }
    return ok(
      await this.prisma.riderProfile.update({
        where: { id: profile.id },
        data: { status: RiderStatus.SUBMITTED, submittedAt: new Date() },
        include: this.include(),
      }),
      'Rider profile submitted',
    );
  }

  async createDocument(userId: string, dto: CreateRiderDocumentDto) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Rider profile not found');
    return ok(
      await this.prisma.verificationDocument.create({
        data: {
          ownerType: VerificationDocumentOwnerType.RIDER,
          riderProfileId: profile.id,
          type: dto.type,
          fileUrl: dto.fileUrl,
        },
      }),
      'Rider document added',
    );
  }

  async documents(userId: string) {
    const profile = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Rider profile not found');
    return ok(
      await this.prisma.verificationDocument.findMany({
        where: { riderProfileId: profile.id },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  private toProfileData(dto: Partial<CreateRiderProfileDto>) {
    return {
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      cityId: dto.cityId,
      zoneId: dto.zoneId,
      vehicleType: dto.vehicleType,
      vehicleNumber: dto.vehicleNumber,
      panUrl: dto.panUrl,
      aadhaarUrl: dto.aadhaarUrl,
      drivingLicenseUrl: dto.drivingLicenseUrl,
      vehicleRcUrl: dto.vehicleRcUrl,
      insuranceUrl: dto.insuranceUrl,
      selfieUrl: dto.selfieUrl,
      profilePhotoUrl: dto.profilePhotoUrl,
      upiId: dto.upiId,
      bankAccount: dto.bankAccount,
      emergencyName: dto.emergencyName,
      emergencyPhone: dto.emergencyPhone,
      currentLatitude: dto.currentLatitude,
      currentLongitude: dto.currentLongitude,
    };
  }

  private include() {
    return {
      user: true,
      city: true,
      zone: true,
      verificationDocuments: true,
      shopRiders: { include: { shop: true } },
    };
  }

  private normalizeAvailability(status: RiderAvailabilityStatus) {
    if (status === RiderAvailabilityStatus.AVAILABLE) {
      return RiderAvailabilityStatus.ONLINE;
    }
    if (status === RiderAvailabilityStatus.ON_DELIVERY) {
      return RiderAvailabilityStatus.BUSY;
    }
    return status;
  }
}

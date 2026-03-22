import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('driver')
  @UseGuards(RolesGuard)
  @Roles(RoleName.DRIVER)
  @ApiOperation({ summary: 'Driver submits a review for a parking location' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async createDriverReview(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createDriverReview(req.user.id, dto);
  }

  @Post('host')
  @UseGuards(RolesGuard)
  @Roles(RoleName.HOST)
  @ApiOperation({ summary: 'Host submits a review for a driver' })
  @ApiResponse({ status: 201, description: 'Review created' })
  async createHostReview(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createHostReview(req.user.id, dto);
  }

  @Get('location/:locationId')
  @ApiOperation({ summary: 'Get all reviews for a parking location' })
  async getLocationReviews(@Param('locationId') locationId: string) {
    return this.reviewsService.getReviewsForLocation(locationId);
  }

  @Get('location/:locationId/rating')
  @ApiOperation({ summary: 'Get average rating for a parking location' })
  async getLocationRating(@Param('locationId') locationId: string) {
    return this.reviewsService.getLocationAverageRating(locationId);
  }

  @Get('driver/:driverId')
  @ApiOperation({ summary: 'Get all reviews for a driver' })
  async getDriverReviews(@Param('driverId') driverId: string) {
    return this.reviewsService.getReviewsForDriver(driverId);
  }

  @Get('reservation/:reservationId')
  @ApiOperation({ summary: 'Get reviews for a specific reservation' })
  async getReservationReviews(
    @Param('reservationId') reservationId: string,
  ) {
    return this.reviewsService.getReviewsForReservation(reservationId);
  }
}

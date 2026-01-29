import { Controller, Get, Query } from '@nestjs/common';
import { PropertyService } from './property.service';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  /**
   * List published properties. Optional query param: investmentModel
   * Example: GET /properties?investmentModel=OUTRIGHT_PURCHASE
   */
  @Get()
  async listPublished(
    @Query('investmentModel') investmentModel?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : undefined;
    const l = limit ? parseInt(limit, 10) : undefined;
    return this.propertyService.listPublished(investmentModel, p, l);
  }
}

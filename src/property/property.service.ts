import { Injectable } from '@nestjs/common';
import { PropertyRepository } from './property.repository';

@Injectable()
export class PropertyService {
  constructor(private readonly propertyRepository: PropertyRepository) {}

  async createProperty(model: string, payload: any) {
    // Controller-level validation (global ValidationPipe) validates DTOs.
    // Ensure the stored record includes the investmentModel value.
    const data = { ...payload, investmentModel: model };
    return this.propertyRepository.createProperty(data);
  }
}

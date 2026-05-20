import { Controller, Get } from '@nestjs/common';
import { ModelManagementService } from './model-management.service';

@Controller('models')
export class ModelCatalogController {
  constructor(private readonly modelService: ModelManagementService) {}

  @Get()
  async getActiveModels() {
    return this.modelService.findAllActive();
  }
}

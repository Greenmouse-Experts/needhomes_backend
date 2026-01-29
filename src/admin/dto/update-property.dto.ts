import { IsBoolean } from 'class-validator';

export class UpdatePropertyPublishedDto {
  @IsBoolean()
  published: boolean;
}

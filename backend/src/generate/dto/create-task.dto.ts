import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  negativePrompt?: string;

  @IsString()
  @IsIn(['txt2img', 'img2img'])
  type: string = 'txt2img';
  
  @IsString()
  @IsOptional()
  style?: string;

  @IsString()
  @IsOptional()
  initImage?: string;

  @IsString()
  @IsOptional()
  model?: string;
}

// dto/proctoring-video.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class ProctoringVideoDto {
  @IsString()
  @IsNotEmpty()
  url_video!: string;
}

// dto/proctoring-warn.dto.ts
import { IsOptional } from 'class-validator';

export class ProctoringWarnDto {
  @IsString()
  @IsOptional()
  motivo?: string; // 'NO_FACE', 'TAB_SWITCH', 'WINDOW_BLUR', etc.
}

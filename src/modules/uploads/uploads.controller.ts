import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { bucket } from '../../firebase';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) throw new BadRequestException('Archivo requerido.');

    const user = req.user;
    if (!user?.id_usuario) throw new BadRequestException('Usuario inválido.');
    if (!['DOCENTE', 'ADMIN', 'ESTUDIANTE'].includes(user.rol)) {
      throw new BadRequestException('No tienes permisos para subir archivos.');
    }

    const mime = (file.mimetype || '').toLowerCase();

    const isAllowed =
      mime.startsWith('image/') ||
      mime.startsWith('audio/') ||
      mime.startsWith('video/');
    if (!isAllowed)
      throw new BadRequestException('Tipo de archivo no permitido.');

    // límites
    const max = mime.startsWith('image/')
      ? 5 * 1024 * 1024
      : mime.startsWith('audio/')
        ? 25 * 1024 * 1024
        : 80 * 1024 * 1024; // video

    if (file.size > max)
      throw new BadRequestException('Archivo demasiado pesado.');

    const usuarioId = Number(user.id_usuario);

    // ✅ lee body (multipart/form-data)
    const intentoId = Number(req.body?.intentoId ?? 0);
    const preguntaId = Number(req.body?.preguntaId ?? 0);

    // extensión real basada en mimetype
    const ext = this.extFromMime(mime);

    let name: string;

    // =========================================================
    // ✅ 1) VIDEO proctoring del estudiante por intento (sobrescribe)
    // =========================================================
    if (
      mime.startsWith('video/') &&
      intentoId > 0 &&
      user.rol === 'ESTUDIANTE'
    ) {
      name = `resources/intentos/${intentoId}/proctoring/usuario_${usuarioId}.${ext}`;
    }
    // =========================================================
    // ✅ 2) AUDIO del estudiante por pregunta (sobrescribe)
    // =========================================================
    else if (
      mime.startsWith('audio/') &&
      intentoId > 0 &&
      preguntaId > 0 &&
      user.rol === 'ESTUDIANTE'
    ) {
      name = `resources/intentos/${intentoId}/preguntas/${preguntaId}/usuario_${usuarioId}.${ext}`;
    }
    // =========================================================
    // ✅ 3) Fallback (docente/admin o multimedia general)
    // =========================================================
    else {
      const rand = Math.random().toString(16).slice(2);
      name = `resources/usuarios/${usuarioId}/${Date.now()}-${rand}.${ext}`;
    }

    const blob = bucket.file(name);

    await blob.save(file.buffer, {
      contentType: mime,
      resumable: false,
      metadata: {
        cacheControl: 'no-store',
      },
    });

    // ⚠️ Ojo: makePublic deja el archivo público. Si luego quieres seguridad real,
    // mejor firmas URL (signed urls) o guardas y sirves vía backend.
    await blob.makePublic();

    const url = `https://storage.googleapis.com/${bucket.name}/${name}`;
    return { url };
  }

  private extFromMime(mime: string): string {
    const m = (mime || '').toLowerCase();

    // video
    if (m.includes('webm')) return 'webm';
    if (m.includes('mp4')) return 'mp4';
    if (m.includes('quicktime')) return 'mov'; // por si te llega video/quicktime

    // audio
    if (m.includes('ogg')) return 'ogg';
    if (m.includes('mpeg')) return 'mp3';
    if (m.includes('wav')) return 'wav';
    if (m.includes('m4a') || m.includes('mp4')) return 'm4a';

    // images típicas
    if (m.includes('png')) return 'png';
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
    if (m.includes('webp')) return 'webp';

    return 'bin';
  }
}

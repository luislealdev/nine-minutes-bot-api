import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsApp } from '@/utils/sendWhatsapp';
import prisma from '@/lib/prisma';

// Array de las preguntas para solicitud de empleo - Pizzayork
const JOB_QUESTIONS = [
  "¡Hola! Bienvenido al proceso de solicitud de empleo de Pizzayork. 🍕\n\n¿Tienes al menos 18 años de edad?",
  "¿A qué sucursal de Pizzayork te gustaría aplicar? (Por favor menciona la sucursal o zona de tu preferencia)",
  "¿Tienes disponibilidad para rotar entre turno matutino y vespertino?",
  "¿Tienes disponibilidad para trabajar fines de semana?"
];

// Información de sucursales Pizzayork
const BRANCH_INFO = {
  sucursales: {
    "centro": {
      nombre: "Sucursal Centro",
      direccion: "Av. Juárez #456, Centro Histórico"
    },
    "norte": {
      nombre: "Sucursal Norte",
      direccion: "Blvd. Norte #123, Col. Norte"
    },
    "sur": {
      nombre: "Sucursal Sur",
      direccion: "Av. Sur #789, Col. Sur"
    },
    "plaza": {
      nombre: "Sucursal Plaza",
      direccion: "Plaza Comercial Local 15, Col. Plaza"
    }
  },

  getFinalMessage: (sucursal: string) => {
    // Buscar la sucursal mencionada
    let selectedBranch = null;
    const sucursalLower = sucursal.toLowerCase();

    for (const [key, branch] of Object.entries(BRANCH_INFO.sucursales)) {
      if (sucursalLower.includes(key) || sucursalLower.includes(branch.nombre.toLowerCase())) {
        selectedBranch = branch;
        break;
      }
    }

    // Si no encuentra sucursal específica, usar mensaje genérico
    if (!selectedBranch) {
      return `🎉 ¡Felicidades! Has completado exitosamente el proceso de solicitud para Pizzayork.

🍕 Por favor lleva tu solicitud de empleo de 11:00 AM a 7:00 PM y te contactaremos para entrevista.

📍 Sucursales disponibles:
• Sucursal Centro: Av. Juárez #456, Centro Histórico
• Sucursal Norte: Blvd. Norte #123, Col. Norte  
• Sucursal Sur: Av. Sur #789, Col. Sur
• Sucursal Plaza: Plaza Comercial Local 15, Col. Plaza

¡Te esperamos para formar parte del equipo Pizzayork! 🍕✨`;
    }

    return `🎉 ¡Felicidades! Has completado exitosamente el proceso de solicitud para Pizzayork.

🍕 Aplicaste para: ${selectedBranch.nombre}
📍 Dirección: ${selectedBranch.direccion}

⏰ Por favor lleva tu solicitud de empleo de 11:00 AM a 7:00 PM y te contactaremos para entrevista.

¡Te esperamos para formar parte del equipo Pizzayork! 🍕✨`;
  }
};

// Manejador para peticiones POST (webhook de WhatsApp)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('🔔 Webhook empleo recibido:', new Date().toISOString());
    console.log('📦 Datos:', JSON.stringify(body, null, 2));

    // Verificar que es un mensaje de texto y no es del bot
    if (body.event !== 'message' || !body.payload || body.payload.fromMe) {
      return NextResponse.json({
        success: true,
        message: 'Evento ignorado',
        timestamp: new Date().toISOString()
      });
    }

    // Extraer información del mensaje
    const phone = body.payload.from.split('@')[0];
    const message = body.payload.body?.trim() || '';
    const senderName = body.payload._data?.notifyName || 'Candidato';

    if (!phone || !message) {
      return NextResponse.json({
        success: false,
        message: 'Datos incompletos',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`📱 Mensaje de empleo recibido de ${senderName} (${phone}): "${message}"`);

    // Buscar progreso existente
    let progress = await prisma.surveyProgress.findFirst({
      where: { phoneNumber: phone }
    });

    if (!progress) {
      // Solo iniciar el proceso si el mensaje incluye "empleo"
      if (message.toLowerCase().includes("empleo")) {
        // Crear nuevo progreso y enviar primera pregunta
        progress = await prisma.surveyProgress.create({
          data: {
            phoneNumber: phone,
            currentQuestion: 1
          }
        });

        await sendWhatsApp(phone, JOB_QUESTIONS[0]);

        return NextResponse.json({
          success: true,
          message: 'Proceso de solicitud iniciado',
          currentQuestion: 1,
          timestamp: new Date().toISOString()
        });
      } else {
        // Si no incluye "empleo", ignorar el mensaje
        return NextResponse.json({
          success: true,
          message: 'Mensaje ignorado - no contiene palabras clave',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Si ya completó el proceso
    if (progress.isCompleted) {
      await sendWhatsApp(phone, "Ya has completado tu solicitud de empleo. ¡Gracias por tu interés!");

      return NextResponse.json({
        success: true,
        message: 'Solicitud ya completada',
        timestamp: new Date().toISOString()
      });
    }

    // Procesar respuesta
    const answerValue = message.toLowerCase();
    const currentQuestion = progress.currentQuestion || 1;

    // Para la pregunta 2 (sucursal), aceptar cualquier respuesta y continuar
    if (currentQuestion === 2) {
      // Guardar la sucursal mencionada
      const nextQuestion = currentQuestion + 1;

      await prisma.surveyProgress.update({
        where: { id: progress.id },
        data: {
          currentQuestion: nextQuestion,
          sucursal: message // Guardar la respuesta de sucursal
        }
      });

      await sendWhatsApp(phone, `✅ Perfecto! Sucursal registrada.\n\n${JOB_QUESTIONS[nextQuestion - 1]}`);

      return NextResponse.json({
        success: true,
        message: 'Sucursal registrada',
        currentQuestion: nextQuestion,
        timestamp: new Date().toISOString()
      });
    }

    // Para las demás preguntas, solo aceptar sí/no
    if (answerValue === "si" || answerValue === "sí") {
      const nextQuestion = currentQuestion + 1;

      if (nextQuestion <= JOB_QUESTIONS.length) {
        // Avanzar a la siguiente pregunta
        await prisma.surveyProgress.update({
          where: { id: progress.id },
          data: { currentQuestion: nextQuestion }
        });

        await sendWhatsApp(phone, `✅ Perfecto!\n\n${JOB_QUESTIONS[nextQuestion - 1]}`);
      } else {
        // Todas las preguntas completadas con "sí"
        await prisma.surveyProgress.update({
          where: { id: progress.id },
          data: { isCompleted: true }
        });

        // Usar la sucursal guardada en el progreso
        const sucursalMencionada = progress.sucursal || "";
        await sendWhatsApp(phone, BRANCH_INFO.getFinalMessage(sucursalMencionada));
      }

      return NextResponse.json({
        success: true,
        message: 'Respuesta afirmativa procesada',
        currentQuestion: nextQuestion > JOB_QUESTIONS.length ? 'completed' : nextQuestion,
        timestamp: new Date().toISOString()
      });

    } else if (answerValue === "no") {
      // Terminar proceso por respuesta negativa
      await prisma.surveyProgress.update({
        where: { id: progress.id },
        data: { isCompleted: true }
      });

      await sendWhatsApp(phone, `Gracias por tu interés en Pizzayork, ${senderName}. 

Lamentablemente en este momento no cumples con todos los requisitos para el puesto, pero te invitamos a aplicar nuevamente en el futuro.

¡Te deseamos mucho éxito! 🍕`);

      return NextResponse.json({
        success: true,
        message: 'Solicitud terminada por respuesta negativa',
        timestamp: new Date().toISOString()
      });

    } else {
      // Respuesta no válida (excepto para pregunta de sucursal)
      if (currentQuestion === 2) {
        await sendWhatsApp(phone, "Por favor menciona la sucursal de tu preferencia.");
      } else {
        await sendWhatsApp(phone, "Por favor responde únicamente con 'sí' o 'no' para continuar con el proceso.");
      }

      return NextResponse.json({
        success: true,
        message: 'Respuesta no válida',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Error procesando solicitud de empleo:', error);
    return NextResponse.json({
      success: false,
      message: 'Error procesando solicitud de empleo',
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Manejador para peticiones GET (para iniciar proceso manualmente)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone')?.replace(/\D/g, '');

    if (!phone || phone.length < 10) {
      return NextResponse.json({
        success: false,
        message: 'Número de teléfono inválido'
      }, { status: 400 });
    }

    const formattedPhone = phone.startsWith('521') || phone.startsWith('52') ?
      phone :
      `521${phone}`;

    // Verificar si ya tiene un progreso activo
    const existingProgress = await prisma.surveyProgress.findFirst({
      where: {
        phoneNumber: formattedPhone,
        isCompleted: false
      }
    });

    if (existingProgress) {
      return NextResponse.json({
        success: false,
        message: 'Ya tienes un proceso de solicitud activo'
      }, { status: 400 });
    }

    // Crear nuevo progreso
    await prisma.surveyProgress.create({
      data: {
        phoneNumber: formattedPhone,
        currentQuestion: 1
      }
    });

    // Enviar primera pregunta
    await sendWhatsApp(formattedPhone, JOB_QUESTIONS[0]);

    return NextResponse.json({
      success: true,
      message: 'Proceso de solicitud de empleo iniciado',
      phone: formattedPhone,
      currentQuestion: 1,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error iniciando solicitud de empleo:', error);
    return NextResponse.json({
      success: false,
      message: 'Error iniciando solicitud de empleo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

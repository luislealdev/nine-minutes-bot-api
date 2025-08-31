import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsApp } from '@/utils/sendWhatsapp';
import prisma from '@/lib/prisma';

// Array de las preguntas para solicitud de empleo - Pizzayork
const JOB_QUESTIONS = [
  "¡Hola! Bienvenido al proceso de solicitud de empleo de Pizzayork. 🍕🗽\n\n¿Tienes al menos 18 años de edad?",
  "¿A qué sucursal de Pizzayork te gustaría aplicar? (Por favor menciona la sucursal o zona de tu preferencia)",
  "¿Tienes disponibilidad para rotar entre turno matutino y vespertino?",
  "¿Tienes disponibilidad para trabajar fines de semana?"
];

// Información de sucursales actualizada
const BRANCHES = [
  {
    key: "patria",
    nombre: "Sucursal Patria",
    telefono: "442 645 8226",
    direccion: "Av. Patria 511, Plaza Patria 501, Local B, FRENTE AL UTEQ, Col. Pedrito Peñuelas, Querétaro, Qro."
  },
  {
    key: "americas",
    nombre: "Sucursal Américas",
    telefono: "442 222 1540",
    direccion: "Av. Las Americas esq. Francisco, Escudero 100, Reforma Agraria, 2A Sección, Querétaro, Qro."
  },
  {
    key: "mompani",
    nombre: "Sucursal Mompani",
    telefono: "4424290530",
    direccion: "Paseo de Querétaro 6102, Col. Paseos de San Miguel , Querétaro, Qro. JUNTO A LECAROZ"
  },
  {
    key: "sanisidro",
    nombre: "Sucursal San Isidro",
    telefono: "464 162 9355",
    direccion: "Av. Valle de Santiago 1500 A, Col. San Isidro JUNTO A POLLOS GUERRERO, Salamanca, Gto."
  },
  {
    key: "centro",
    nombre: "Sucursal Centro",
    telefono: "4641629284",
    direccion: "Sánchez Torrado 614 , Zona Centro, FRENTE AL TIANGUIS DE LOS MIÉRCOLES, Salamanca, Gto."
  },
  {
    key: "apaseo",
    nombre: "Sucursal Apaseo El Grande",
    telefono: "4136903792",
    direccion: "Andador Galeana 107 A, En el Jardín de los Enamorados, Zona Centro, Apaseo El Grande, Gto."
  },
  {
    key: "comonfort",
    nombre: "Sucursal Comonfort",
    telefono: "4111602238",
    direccion: "Ignacio Allende 26 D, Abajo de los Pasaportes y Visas, Zona Centro, Comonfort, Gto."
  },
  {
    key: "jaral",
    nombre: "Sucursal Jaral",
    telefono: "411 688 2261",
    direccion: "Porfirio Díaz 141, Zona Centro, jardín principal Jaral del Progreso, Gto."
  },
  {
    key: "salvatierra",
    nombre: "Sucursal Salvatierra",
    telefono: "466 663 0348",
    direccion: "Federico Escobedo, Zona Centro, Frente al Reloj del Mercado Hidalgo, Salvatierra, Gto."
  }
];

function getBranchListMessage() {
  let msg = "Estas son las sucursales disponibles para aplicar:\n\n";
  BRANCHES.forEach((branch, idx) => {
    msg += `${idx + 1}. ${branch.nombre}\n   Dirección: ${branch.direccion}\n`;
  });
  msg += "\nPor favor menciona el nombre o número de la sucursal de tu preferencia.";
  return msg;
}

function getFinalMessage(sucursal: string) {
  let selectedBranch = null;
  const sucursalLower = sucursal.toLowerCase();
  for (const [idx, branch] of BRANCHES.entries()) {
    if (
      sucursalLower.includes(branch.key) ||
      sucursalLower.includes(branch.nombre.toLowerCase()) ||
      sucursalLower.includes((idx + 1).toString())
    ) {
      selectedBranch = branch;
      break;
    }
  }
  if (!selectedBranch) {
    let msg = `🎉 ¡Felicidades! Has completado exitosamente el proceso de solicitud.\n\n`;
    msg += `Por favor lleva tu solicitud de empleo de 11:00 AM a 7:00 PM y te contactaremos para entrevista.\n\n`;
    msg += getBranchListMessage();
    msg += "\n\n¡Te esperamos para formar parte del equipo! 🍕🗽✨";
    return msg;
  }
  return `🎉 ¡Felicidades! Has completado exitosamente el proceso de solicitud.\n\nAplicaste para: ${selectedBranch.nombre}\n📍 Dirección: ${selectedBranch.direccion}\n📞 Teléfono: ${selectedBranch.telefono}\n\nPor favor lleva tu solicitud de empleo de 11:00 AM a 7:00 PM y te contactaremos para entrevista.\n\n¡Te esperamos para formar parte del equipo! 🍕🗽✨`;
}

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
        // Crear nuevo progreso y enviar primera pregunta y sucursales
        progress = await prisma.surveyProgress.create({
          data: {
            phoneNumber: phone,
            currentQuestion: 1
          }
        });
        await sendWhatsApp(phone, getBranchListMessage());
        await sendWhatsApp(phone, JOB_QUESTIONS[0]);
        return NextResponse.json({
          success: true,
          message: 'Proceso de solicitud iniciado',
          currentQuestion: 1,
          timestamp: new Date().toISOString()
        });
      } else {
        // Si no incluye "empleo", no responder nada
        return new Response(null, { status: 204 });
      }
    }

    // Si ya completó el proceso
    if (progress.isCompleted) {
      // Si el mensaje incluye "empleo", verificar fecha de última aplicación
      if (message.toLowerCase().includes("empleo")) {
        const lastApplied = progress.updatedAt || progress.createdAt;
        const now = new Date();
        const diffMs = now.getTime() - new Date(lastApplied).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 90) {
          await sendWhatsApp(phone, `Gracias por tu interés. Ya has aplicado recientemente. Puedes volver a aplicar después de 3 meses desde tu última solicitud.`);
          return NextResponse.json({
            success: true,
            message: 'Solicitud ya completada, debe esperar 3 meses',
            timestamp: now.toISOString()
          });
        } else {
          // Permitir nueva aplicación
          await prisma.surveyProgress.create({
            data: {
              phoneNumber: phone,
              currentQuestion: 1
            }
          });
          await sendWhatsApp(phone, getBranchListMessage());
          await sendWhatsApp(phone, JOB_QUESTIONS[0]);
          return NextResponse.json({
            success: true,
            message: 'Nuevo proceso de solicitud iniciado',
            currentQuestion: 1,
            timestamp: now.toISOString()
          });
        }
      } else {
        // Si no incluye "empleo", no responder nada
        return new Response(null, { status: 204 });
      }
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
        await sendWhatsApp(phone, getFinalMessage(sucursalMencionada));
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
      await sendWhatsApp(phone, `Gracias por tu interés, ${senderName}.\n\nLamentablemente en este momento no cumples con todos los requisitos para el puesto, pero te invitamos a aplicar nuevamente en el futuro.\n\n¡Te deseamos mucho éxito! 🍕🗽`);
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

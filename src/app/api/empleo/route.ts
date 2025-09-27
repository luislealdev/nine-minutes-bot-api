import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsApp } from '@/utils/sendWhatsapp';
import prisma from '@/lib/prisma';

// Array de las preguntas para solicitud de empleo - Pizzayork
const JOB_QUESTIONS = [
  "¡Hola! Bienvenido al proceso de solicitud de empleo de Pizzayork. 🍕🗽\n\n¿Tienes al menos 18 años de edad?",
  // "¿Tienes disponibilidad para rotar entre turno matutino y vespertino?",
  "¿Tienes disponibilidad para trabajar fines de semana?"
];

// Información de sucursales actualizada
const BRANCHES = [
  {
    key: "patria",
    nombre: "Sucursal Patria",
    telefono: "442 645 8226",
    direccion: "Av. Patria 511, Querétaro, Qro."
  },
  {
    key: "americas",
    nombre: "Sucursal Américas",
    telefono: "442 222 1540",
    direccion: "Av. Las Americas, Querétaro, Qro."
  },
  {
    key: "mompani",
    nombre: "Sucursal Mompani",
    telefono: "4424290530",
    direccion: "Paseo de Querétaro 6102, Querétaro, Qro."
  },
  {
    key: "sanisidro",
    nombre: "Sucursal San Isidro",
    telefono: "464 162 9355",
    direccion: "Av. Valle de Santiago 1500A, Salamanca, Gto."
  },
  {
    key: "centro",
    nombre: "Sucursal Centro",
    telefono: "4641629284",
    direccion: "Sánchez Torrado 614, Salamanca, Gto."
  },
  {
    key: "apaseo",
    nombre: "Sucursal Apaseo El Grande",
    telefono: "4136903792",
    direccion: "Andador Galeana 107A, Apaseo El Grande, Gto."
  },
  {
    key: "comonfort",
    nombre: "Sucursal Comonfort",
    telefono: "4111602238",
    direccion: "Ignacio Allende 26D, Comonfort, Gto."
  },
  {
    key: "jaral",
    nombre: "Sucursal Jaral",
    telefono: "411 688 2261",
    direccion: "Porfirio Díaz 141, Jaral del Progreso, Gto."
  },
  {
    key: "salvatierra",
    nombre: "Sucursal Salvatierra",
    telefono: "466 663 0348",
    direccion: "Federico Escobedo, Salvatierra, Gto."
  },
  {
    key: "silao",
    nombre: "Sucursal Silao",
    telefono: "",
    direccion: "Calle 5 de mayo #14 esquina con calle honda, frente al registro civil, Silao, Gto."
  }
];


// Agrupar sucursales por ciudad
const CITIES = {
  "querétaro": {
    name: "Querétaro",
    keywords: ["querétaro", "qro", "queretaro"],
    branches: ["patria", "americas", "mompani"]
  },
  "salamanca": {
    name: "Salamanca",
    keywords: ["salamanca", "gto salamanca"],
    branches: ["sanisidro", "centro"]
  },
  "apaseo": {
    name: "Apaseo El Grande",
    keywords: ["apaseo", "apaseo el grande", "apaseo grande", "grande"],
    branches: ["apaseo"]
  },
  "comonfort": {
    name: "Comonfort",
    keywords: ["comonfort"],
    branches: ["comonfort"]
  },
  "jaral": {
    name: "Jaral del Progreso",
    keywords: ["jaral", "jaral del progreso", "jaral progreso", "progreso"],
    branches: ["jaral"]
  },
  "salvatierra": {
    name: "Salvatierra",
    keywords: ["salvatierra"],
    branches: ["salvatierra"]
  },
  "silao": {
    name: "Silao",
    keywords: ["silao", "5 de mayo", "registro civil", "honda"],
    branches: ["silao"]
  }
};

// Función para detectar ciudad
function detectCity(message: string): string | null {
  const messageLower = message.toLowerCase();
  for (const [cityKey, cityData] of Object.entries(CITIES)) {
    if (cityData.keywords.some(keyword => messageLower.includes(keyword))) {
      return cityKey;
    }
  }
  return null;
}

// Función para detectar sucursal específica (cuando hay múltiples en una ciudad)
function detectBranchInCity(message: string, cityKey: string) {
  const messageLower = message.toLowerCase();
  const cityBranches = CITIES[cityKey as keyof typeof CITIES].branches;

  for (const branchKey of cityBranches) {
    const branch = BRANCHES.find(b => b.key === branchKey);
    if (!branch) continue;

    // Verificar por nombre de sucursal o palabras clave específicas
    if (messageLower.includes(branch.key) ||
      messageLower.includes(branch.nombre.toLowerCase()) ||
      (branch.key === "patria" && messageLower.includes("patria")) ||
      (branch.key === "americas" && (messageLower.includes("américas") || messageLower.includes("americas"))) ||
      (branch.key === "mompani" && (messageLower.includes("mompani") || messageLower.includes("paseo"))) ||
      (branch.key === "sanisidro" && (messageLower.includes("san isidro") || messageLower.includes("isidro") || messageLower.includes("valle"))) ||
      (branch.key === "centro" && messageLower.includes("centro"))) {
      return branch;
    }
  }
  return null;
}


function getFinalMessage(sucursal: string) {
  const sucursalLower = sucursal.toLowerCase();
  let selectedBranch = null;

  // Buscar directamente en las sucursales
  for (const branch of BRANCHES) {
    if (sucursalLower.includes(branch.key) ||
      sucursalLower.includes(branch.nombre.toLowerCase()) ||
      (branch.key === "patria" && sucursalLower.includes("patria")) ||
      (branch.key === "americas" && (sucursalLower.includes("américas") || sucursalLower.includes("americas"))) ||
      (branch.key === "mompani" && (sucursalLower.includes("mompani") || sucursalLower.includes("paseo"))) ||
      (branch.key === "sanisidro" && (sucursalLower.includes("san isidro") || sucursalLower.includes("isidro") || sucursalLower.includes("valle"))) ||
      (branch.key === "centro" && sucursalLower.includes("centro")) ||
      (branch.key === "apaseo" && sucursalLower.includes("apaseo")) ||
      (branch.key === "comonfort" && sucursalLower.includes("comonfort")) ||
      (branch.key === "jaral" && (sucursalLower.includes("jaral") || sucursalLower.includes("progreso"))) ||
      (branch.key === "salvatierra" && sucursalLower.includes("salvatierra"))) {
      selectedBranch = branch;
      break;
    }
  }

  if (selectedBranch) {
    return `🎉 ¡Felicidades! Has completado exitosamente el proceso de solicitud.\n\nAplicaste para: ${selectedBranch.nombre}\n📍 Dirección: ${selectedBranch.direccion}\nPor favor llévanos tu solicitud o CV a la sucursal correspondiente y te agendamos una cita\n\n¡Te esperamos para formar parte del equipo! 🍕🗽✨`;
  }
  // Si no se detecta sucursal, mensaje genérico
  return `🎉 ¡Felicidades! Has completado exitosamente el proceso de solicitud.\n\nPor favor llévanos tu solicitud o CV a la sucursal correspondiente y te agendamos una cita`;
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
      // Iniciar el proceso con cualquier mensaje
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
    }

    // Si ya completó el proceso
    if (progress.isCompleted) {
      // Verificar fecha de última aplicación
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
        await sendWhatsApp(phone, JOB_QUESTIONS[0]);
        return NextResponse.json({
          success: true,
          message: 'Nuevo proceso de solicitud iniciado',
          currentQuestion: 1,
          timestamp: now.toISOString()
        });
      }
    }

    // Procesar respuesta
    const answerValue = message.toLowerCase();
    const currentQuestion = progress.currentQuestion || 1;

    // Para las preguntas, solo aceptar sí/no
    if (answerValue === "si" || answerValue === "sí") {
      const nextQuestion = currentQuestion + 1;

      if (currentQuestion === 1) {
        // Después de la primera pregunta (edad), preguntar por la ciudad
        await prisma.surveyProgress.update({
          where: { id: progress.id },
          data: { currentQuestion: nextQuestion }
        });
        await sendWhatsApp(phone, `¿En qué ciudad te gustaría trabajar? (Por favor menciona el nombre de la ciudad)`);
      } else if (nextQuestion <= JOB_QUESTIONS.length + 1) {
        // Para las siguientes preguntas normales
        await prisma.surveyProgress.update({
          where: { id: progress.id },
          data: { currentQuestion: nextQuestion }
        });
        await sendWhatsApp(phone, `✅ Perfecto!\n\n${JOB_QUESTIONS[nextQuestion - 2]}`);
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
        currentQuestion: nextQuestion > JOB_QUESTIONS.length + 1 ? 'completed' : nextQuestion,
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
      // Respuesta no válida o pregunta de ciudad/sucursal
      if (currentQuestion === 2) {
        // Manejar respuesta de ciudad
        const cityKey = detectCity(message);
        if (cityKey) {
          const cityData = CITIES[cityKey as keyof typeof CITIES];
          const cityBranches = cityData.branches.map(branchKey =>
            BRANCHES.find(b => b.key === branchKey)!
          );

          if (cityBranches.length === 1) {
            // Solo una sucursal en esta ciudad, continuar automáticamente
            const nextQuestion = currentQuestion + 1;
            await prisma.surveyProgress.update({
              where: { id: progress.id },
              data: {
                currentQuestion: nextQuestion,
                sucursal: cityBranches[0].nombre // Guardar la sucursal
              }
            });
            await sendWhatsApp(phone, `✅ Perfecto! Ciudad registrada: ${cityData.name} - ${cityBranches[0].nombre}.\n\n${JOB_QUESTIONS[nextQuestion - 2]}`);
          } else {
            // Múltiples sucursales, mostrar opciones
            let branchList = `✅ Perfecto! Tenemos las siguientes sucursales en ${cityData.name}:\n\n`;
            cityBranches.forEach((branch, idx) => {
              branchList += `${idx + 1}. ${branch.nombre}\n`;
            });
            branchList += `\n¿A qué sucursal te gustaría aplicar? (Por favor menciona el nombre de la sucursal)`;

            await prisma.surveyProgress.update({
              where: { id: progress.id },
              data: {
                currentQuestion: 2.5, // Estado intermedio para selección de sucursal
                sucursal: cityKey // Guardar la ciudad temporalmente
              }
            });
            await sendWhatsApp(phone, branchList);
          }
        } else {
          await sendWhatsApp(phone, "No reconozco esa ciudad. Por favor menciona una ciudad donde tengamos sucursales (Querétaro, Salamanca, Apaseo El Grande, Comonfort, Jaral del Progreso, Salvatierra).");
        }
        return NextResponse.json({
          success: true,
          message: 'Ciudad procesada',
          currentQuestion: currentQuestion,
          timestamp: new Date().toISOString()
        });
      } else if (progress.currentQuestion === 2.5) {
        // Manejar selección de sucursal específica
        const cityKey = progress.sucursal;
        if (cityKey) {
          const selectedBranch = detectBranchInCity(message, cityKey);
          if (selectedBranch) {
            const nextQuestion = 3;
            await prisma.surveyProgress.update({
              where: { id: progress.id },
              data: {
                currentQuestion: nextQuestion,
                sucursal: selectedBranch.nombre
              }
            });
            await sendWhatsApp(phone, `✅ Perfecto! Sucursal registrada: ${selectedBranch.nombre}.\n\n${JOB_QUESTIONS[nextQuestion - 2]}`);
          } else {
            await sendWhatsApp(phone, "No reconozco esa sucursal. Por favor menciona el nombre de una de las sucursales listadas anteriormente.");
          }
        }
        return NextResponse.json({
          success: true,
          message: 'Sucursal procesada',
          currentQuestion: progress.currentQuestion,
          timestamp: new Date().toISOString()
        });
      } else {
        await sendWhatsApp(phone, "Por favor responde únicamente con 'sí' o 'no' para continuar con el proceso.");
        return NextResponse.json({
          success: true,
          message: 'Respuesta no válida',
          timestamp: new Date().toISOString()
        });
      }
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

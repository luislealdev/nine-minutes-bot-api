//import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsApp, /*sendWhatsAppPoll*/ } from '@/utils/sendWhatsapp';
//import { sendNextQuestion } from '@/actions/surveys/sendNextQuestion';
import prisma from '@/lib/prisma';


export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { from, message } = body  // viene el número y el texto del usuario

    // buscamos progreso de la encuesta
    let progress = await prisma.surveyProgress.findFirst({
      where: { phoneNumber: from }
    })

    if (!progress) {
      progress = await prisma.surveyProgress.create({
        data: { phoneNumber: from, currentQuestion: 1 }
      })
    }

    const answerValue: string = message.trim().toLowerCase()

    if (answerValue === "si") {
      // avanzar en la encuesta
      await prisma.surveyProgress.update({
        where: { id: progress.id },
        data: { currentQuestion: (progress.currentQuestion ?? 1) + 1 }
      })

      // sendWhatsApp se puede usar por si se requiere confirmación de avance
      await sendWhatsApp(from, "Perfecto, seguimos con la siguiente pregunta.")

    } else if (answerValue === "no") {
      // terminar encuesta
      await prisma.surveyProgress.update({
        where: { id: progress.id },
        data: { isCompleted: true }
      })

      await sendWhatsApp(from, "Gracias por tu aplicación. ¡Hasta luego!")
    } else {
      await sendWhatsApp(from, "Por favor responde con 'sí' o 'no'.")
    }

    return new Response(JSON.stringify({ ok: true }))
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}

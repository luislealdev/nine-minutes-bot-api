export const sendWhatsApp = async (phone: string, message: string) => {

    // Limpiar el número (remover espacios, guiones, paréntesis)
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');

    // Verificar si ya tiene código de país y formatear
    let formattedPhone = '';
    if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
        // Ya tiene +1 (formato estadounidense), mantenerlo
        formattedPhone = cleanPhone;
    } else if (cleanPhone.startsWith('521') && cleanPhone.length === 13) {
        // Ya tiene 521 (código mexicano), mantenerlo
        formattedPhone = cleanPhone;
    } else if (cleanPhone.length === 10) {
        // Número mexicano sin código de país, agregar 521
        formattedPhone = '521' + cleanPhone;
    } else {
        // Para otros casos, usar el número tal como viene
        formattedPhone = cleanPhone;
    }

    const sendTo = formattedPhone;

    await fetch('https://luislealsoftware-whatsapp-api.creativa2020.com.mx/api/sendText', {

        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Api-Key': process.env.WAHA_API_KEY || '', //
        },

        body: JSON.stringify({
            chatId: `${sendTo}@c.us`,
            text: `${message}\n\n`,
            session: "nine-minutes-bot",
        })
    });

}

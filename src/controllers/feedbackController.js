const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const enviarFeedback = (req, res) => {
    const { mensagem, usuario_email, usuario_nome } = req.body;
    
    if (!mensagem) {
        return res.status(400).json({ error: 'A mensagem não pode estar vazia.' });
    }
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'vinylvault.premiumcollection@gmail.com',
        replyTo: usuario_email || process.env.EMAIL_USER,
        subject: `Novo Feedback App - ${usuario_nome || 'Anônimo'}`,
        html: `<p><b>Mensagem:</b><br>${mensagem}</p>`
    };
    
    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            return res.status(500).json({ error: 'Erro ao enviar a mensagem de feedback.' });
        }
        res.status(200).json({ message: 'Feedback enviado com sucesso!' });
    });
};

module.exports = {
    enviarFeedback
};
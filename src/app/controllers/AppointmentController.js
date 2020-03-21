import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format } from 'date-fns';
import ptBr from 'date-fns/locale/pt-BR';
import Appointment from '../models/Appointment';
import User from '../models/User';
import Notification from '../schemas/Notification';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: {
        user_id: req.userId,
        canceled_at: null,
      },
      order: ['date'],
      attributes: ['id', 'date'],
      limit: 2,
      offset: (page - 1) * 2,
      include: [{ model: User, as: 'provider' }],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'A validação falhou.' });
    }

    const { provider_id, date } = req.body;

    const isProvider = await User.findOne({
      where: {
        id: provider_id,
        provider: true,
      },
    });

    if (!isProvider) {
      return res.status(401).json({
        error:
          'Você deve criar um agendamento apenas com um prestador de serviços.',
      });
    }

    if (req.userId === provider_id) {
      return res.status(401).json({
        error: 'Você não pode criar um agendamento com você mesmo.',
      });
    }

    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({
        error: 'Não é permito o uso de datas passadas.',
      });
    }

    const checkAvailbility = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailbility) {
      return res.status(400).json({
        error: 'O horário não está disponível.',
      });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    });

    const user = await User.findByPk(req.userId);

    const formatedDate = format(hourStart, "'dia' dd 'de' MMMM', às 'H:mm'h'", {
      locale: ptBr,
    });

    await Notification.create({
      content: `Novo agendamento: ${user.name} agendou um horário ${formatedDate} `,
      user: provider_id,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();

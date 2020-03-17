import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';

class AppointmentController {
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

    return res.json(appointment);
  }

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
}

export default new AppointmentController();

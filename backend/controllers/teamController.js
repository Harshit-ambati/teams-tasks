import Team from '../models/Team.js';

export const getTeams = async (req, res) => {
  try {
    const teams = await Team.find({ owner: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json(teams);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createTeam = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });

    const team = await Team.create({
      name,
      description,
      members: Array.isArray(members) ? members : [],
      owner: req.user.id,
    });

    return res.status(201).json(team);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTeamById = async (req, res) => {
  try {
    const team = await Team.findOne({ _id: req.params.id, owner: req.user.id });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    return res.status(200).json(team);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateTeam = async (req, res) => {
  try {
    const team = await Team.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, req.body, {
      new: true,
      runValidators: true,
    });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    return res.status(200).json(team);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const team = await Team.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    return res.status(200).json({ message: 'Team deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

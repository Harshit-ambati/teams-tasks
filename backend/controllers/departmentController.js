import Department from '../models/Department.js';

export const getDepartments = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'department_leader') {
      query = { leader: req.user.id };
    }

    const departments = await Department.find(query)
      .populate('leader', 'name email')
      .populate('members', 'name email');

    return res.status(200).json(departments);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name, leader, members } = req.body;
    if (!name || !leader) {
      return res.status(400).json({ message: 'Department name and leader are required' });
    }

    const department = await Department.create({
      name,
      leader,
      members: Array.isArray(members) ? members : [],
    });

    const hydrated = await Department.findById(department._id)
      .populate('leader', 'name email role')
      .populate('members', 'name email role');

    return res.status(201).json(hydrated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.leader) updates.leader = req.body.leader;
    if (Array.isArray(req.body.members)) updates.members = req.body.members;

    const department = await Department.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('leader', 'name email role')
      .populate('members', 'name email role');

    if (!department) return res.status(404).json({ message: 'Department not found' });
    return res.status(200).json(department);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

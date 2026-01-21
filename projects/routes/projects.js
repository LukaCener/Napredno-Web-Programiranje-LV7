const express = require('express');
const router = express.Router();
const Project = require('../models/project');
const User = require('../models/user');

const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
};

router.use(isLoggedIn);

// List (Dashboard)
router.get('/', async (req, res, next) => {
  try {
    const managerProjects = await Project.find({ manager: req.user._id, archived: false }).sort({ createdAt: -1 });
    const memberProjects = await Project.find({ team: req.user._id, archived: false }).populate('manager').sort({ createdAt: -1 });
    res.render('projects/index', { managerProjects, memberProjects });
  } catch (err) {
    next(err);
  }
});

// Archive
router.get('/archive', async (req, res, next) => {
  try {
    const managerProjects = await Project.find({ manager: req.user._id, archived: true }).sort({ createdAt: -1 });
    const memberProjects = await Project.find({ team: req.user._id, archived: true }).populate('manager').sort({ createdAt: -1 });
    res.render('projects/archive', { managerProjects, memberProjects });
  } catch (err) {
    next(err);
  }
});

// New
router.get('/new', async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } });
    res.render('projects/new', { project: {}, users });
  } catch (err) {
    next(err);
  }
});

// Create
router.post('/', async (req, res, next) => {
  try {
    const { title, description, price, completedTasks, startDate, endDate, team } = req.body;
    const project = new Project({
      title,
      description,
      price: price ? Number(price) : undefined,
      completedTasks: completedTasks ? Number(completedTasks) : 0,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      manager: req.user._id,
      team: team || []
    });
    await project.save();
    res.redirect(`/projects/${project._id}`);
  } catch (err) {
    next(err);
  }
});

// Show
router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('manager').populate('team');
    if (!project) return res.status(404).send('Projekt nije pronađen');

    // Check access
    const isManager = project.manager.equals(req.user._id);
    const isMember = project.team.some(member => member._id.equals(req.user._id));

    if (!isManager && !isMember) {
      return res.status(403).send('Nemate pristup ovom projektu');
    }

    res.render('projects/show', { project, isManager, isMember });
  } catch (err) {
    next(err);
  }
});

// Edit
router.get('/:id/edit', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send('Projekt nije pronađen');

    const isManager = project.manager.equals(req.user._id);
    const isMember = project.team.includes(req.user._id);

    if (isManager) {
      const users = await User.find({ _id: { $ne: req.user._id } });
      res.render('projects/edit', { project, users, isManager: true });
    } else if (isMember) {
      res.render('projects/edit', { project, isManager: false });
    } else {
      res.status(403).send('Nemate ovlasti za uređivanje');
    }

  } catch (err) {
    next(err);
  }
});

// Update
router.put('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send('Projekt nije pronađen');

    const isManager = project.manager.equals(req.user._id);
    const isMember = project.team.includes(req.user._id);

    if (isManager) {
      const { title, description, price, completedTasks, startDate, endDate, team, archived } = req.body;
      project.title = title;
      project.description = description;
      project.price = price ? Number(price) : undefined;
      project.completedTasks = completedTasks ? Number(completedTasks) : 0;
      project.startDate = startDate || undefined;
      project.endDate = endDate || undefined;
      project.team = team || [];
      project.archived = archived === 'on';

    } else if (isMember) {
      const { completedTasks } = req.body;
      project.completedTasks = completedTasks ? Number(completedTasks) : 0;
    } else {
      return res.status(403).send('Nemate ovlasti');
    }

    await project.save();
    res.redirect(`/projects/${project._id}`);
  } catch (err) {
    next(err);
  }
});

// Delete
router.delete('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).send('Not found');

    if (!project.manager.equals(req.user._id)) {
      return res.status(403).send('Only manager can delete');
    }

    await Project.findByIdAndDelete(req.params.id);
    res.redirect('/projects');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
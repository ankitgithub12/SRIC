const express = require('express');
const router = express.Router();

const admissions = [
  { id: 1, name: 'Alice Johnson', course: 'Computer Science', status: 'Pending' },
  { id: 2, name: 'Bob Brown', course: 'Mathematics', status: 'Approved' }
];

router.get('/', (req, res) => {
  res.json(admissions);
});

router.post('/', (req, res) => {
  const newAdmission = {
    id: admissions.length + 1,
    ...req.body
  };
  admissions.push(newAdmission);
  res.status(201).json(newAdmission);
});

module.exports = router;
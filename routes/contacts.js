const express = require('express');
const router = express.Router();

// Mock data - replace with your actual data source
const contacts = [
  { id: 1, name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321' }
];

// GET all contacts
router.get('/', (req, res) => {
  res.json(contacts);
});

// GET single contact
router.get('/:id', (req, res) => {
  const contact = contacts.find(c => c.id === parseInt(req.params.id));
  if (!contact) return res.status(404).json({ message: 'Contact not found' });
  res.json(contact);
});

// POST new contact
router.post('/', (req, res) => {
  const newContact = {
    id: contacts.length + 1,
    ...req.body
  };
  contacts.push(newContact);
  res.status(201).json(newContact);
});

module.exports = router;
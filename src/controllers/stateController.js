const mongoose = require("mongoose");
const State = require("../models/statesModel");

exports.CreateState = async (req, res) => {
  try {
    const { name } = req.body;
    const state = new State({ name });
    await state.save();
    res.status(200).json({ state });
  } catch (error) {
    res.status(500).json({ error });
  }
};

exports.getStates = async (req, res) => {
  try {
    const states = await State.find();
    res.status(200).json({ states });
  } catch (error) {
    res.status(500).json({ error });
  }
};

import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";
import { notifyUpcomingAppointments } from "../firebaseNotification";


export const router = express.Router();

router.get('/upcoming', (req, res) => {
  notifyUpcomingAppointments((notified, error) => {
    if (error) {
      return res.status(500).json({ error: 'Failed to notify users.' });
    }
    res.status(200).json({ success: true, notified });
  });
});
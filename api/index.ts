import express from "express";
import { conn } from "../dbconnect";
import { UserData } from "../model/userPost";
import mysql from "mysql";
import { GeneralPost } from "../model/generalPost";
import { ClinicPost } from "../model/clinicPost";

export const router = express.Router();

router.get("/", (req, res) => {
    res.status(200).json("test");
})
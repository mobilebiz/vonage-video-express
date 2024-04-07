import { Auth } from "@vonage/auth";
import { Vonage } from "@vonage/server-sdk";
import { vcr } from "@vonage/vcr-sdk";
import express from 'express';
import fs from 'fs'
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.VCR_PORT;

const SESSION_FILE = './session.json'

const credentials = new Auth({
    applicationId: process.env.API_APPLICATION_ID,
    privateKey: process.env.PRIVATE_KEY_PATH
})

const vonage = new Vonage(credentials);

app.use(express.json());
app.use(express.static('public'));

app.post('/token', async (req, res) => {
    console.log(`🐞 token called. ${req.body.userName || ''}`)
    console.log(process.env.API_APPLICATION_ID, process.env.PRIVATE_KEY_PATH)
    let sessionId = ''
    try {
        // Session create when it not exist
        let session = fs.existsSync(SESSION_FILE) ? JSON.parse(fs.readFileSync(SESSION_FILE), 'utf8') : ''
        if (!session) {
            console.log(`🐞 session not exist.`)
            // Create sessionId
            session = await vonage.video.createSession({ mediaMode: "routed"})
            sessionId = session.sessionId
            fs.writeFileSync(SESSION_FILE, JSON.stringify(session))
        } else {
            sessionId = session.sessionId
        }
    } catch (error) {
        console.error(`👺 Create session error. ${error.message}`)
        res.send(error.message).sendStatus(500)
    }
    try {
        const userName = req.body.userName || ''
        if (!userName) {
            throw new Error('userName not set.')
        }
        // JWT create
        const options = {
            role: "publisher",
            expireTime: Math.round(new Date().getTime() / 1000) - 30 + 24 * 60 * 60, // in one day
            data: `name=${userName}`,
            initialLayoutClassList: ["focus"]
        }
        const token = vonage.video.generateClientToken(sessionId, options)

        res.json({"apiKey": process.env.API_APPLICATION_ID, "token": token, "sessionId": sessionId})
    } catch (error) {
        console.error(`👺 Generate token error. ${error.message}`)
        res.sendStatus(500)
    }
})

app.get('/_/health', async (req, res) => {
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
});
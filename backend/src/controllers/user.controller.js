import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Meeting } from "../models/meeting.model.js";

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res
                .status(httpStatus.BAD_REQUEST)
                .json({ message: "Please provide username and password" });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res
                .status(httpStatus.NOT_FOUND)
                .json({ message: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordValid) {
            return res
                .status(httpStatus.UNAUTHORIZED)
                .json({ message: "Invalid password" });
        }

        const token = crypto.randomBytes(20).toString("hex");

        user.token = token;
        await user.save();

        return res
            .status(httpStatus.OK)
            .json({ token });

    } catch (e) {
        return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .json({ message: `Something went wrong ${e}` });
    }
};

const register = async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(httpStatus.BAD_REQUEST).json({ message: "Please provide name, username and password" });
    }

    try {
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res
                .status(httpStatus.CONFLICT)
                .json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();

        return res
            .status(httpStatus.CREATED)
            .json({ message: "User created successfully" });

    } catch (e) {
        return res
            .status(httpStatus.INTERNAL_SERVER_ERROR)
            .json({ message: "Something went wrong" });
    }
};

const getUserFromToken = async (token) => {
    if (!token) return null;
    return User.findOne({ token });
};

const addToHistory = async (req, res) => {
    try {
        const { token, meeting_code } = req.body;
        const user = await getUserFromToken(token);
        if (!user) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid token" });
        if (!meeting_code) return res.status(httpStatus.BAD_REQUEST).json({ message: "meeting_code required" });

        await new Meeting({ user_id: user.username, meetingCode: meeting_code }).save();
        return res.status(httpStatus.CREATED).json({ message: "Added code to history" });
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e}` });
    }
};

const getUserHistory = async (req, res) => {
    try {
        const user = await getUserFromToken(req.query.token);
        if (!user) return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid token" });

        const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
        return res.json(meetings);
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e}` });
    }
};

export { login, register, addToHistory, getUserHistory };
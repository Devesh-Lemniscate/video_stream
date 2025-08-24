import express from "express";
import cors from "cors";
import multer from "multer";
import {v4 as uuidv4} from "uuid";
import path from "path";
import fs from "fs";
import {exec} from "child_process"; // dangerous comand if running in production watchout
import stdout from "process";

const app = express();


// multer middleware
const storage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, 'uploads/');
    },
    filename: (req, file, cb)=>{
        cb(null, file.fieldname + '-' + uuidv4() + path.extname(file.originalname));
    }
});

//multer configuration

const upload = multer({storage: storage});

app.use(
    cors({
        origin: ["http://localhost:8000", "http://localhost:5173"],
        credentials: true,
    })
);

app.use((req,res,next)=>{
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers", 
        "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res)=>{
    res.json({message: "Heya fellas!"});
})


app.post('/upload', upload.single('file'), (req, res)=>{
    const lessonId = uuidv4();
    const videoPath = req.file.path;
    const outputPath = `uploads/courses/lesson-${lessonId}`;
    
    const hlsPath = `${outputPath}/index.m3u8`;   
    // m3u8 file path for HLS streaming it contains the list of .ts files
    // It is a kinda playlist file for video streaming like index file
    // It contains the list of .ts files
   
    console.log("hlsPath", hlsPath);

    if(!fs.existsSync(outputPath)){
        fs.mkdirSync(outputPath, {recursive: true});
    }

    const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`; 
    
    // command takes too much time to execute generally it is run in different server machines

    exec(ffmpegCommand, (error, stdout, stderr)=>{
        if(error){
            console.error(`Error: ${error.message}`);
            return res.status(500).json({error: "Error processing video"});
        }
        if(stderr){
            console.error(`Stderr: ${stderr}`);
        }
        console.log(`Stdout: ${stdout}`);
        
        const videoUrl = `http://localhost:8000/uploads/courses/${lessonId}/index.m3u8`;

        res.json({
            message: "Video uploaded and processed successfully",
            lessonId: lessonId,
            videoUrl: videoUrl
        });
    });
    
});

app.listen(8000, ()=>{
    console.log("App is listening at port 8000");
})

import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  autoConnect: true,
});
socket.on("join_group", (groupId)=>{
    socket.join(groupId);
});

socket.on("group_message",(message)=>{
    io.to(message.group).emit("receive_group_message",message);
});

export default socket;
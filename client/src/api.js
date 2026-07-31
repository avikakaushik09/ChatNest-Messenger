import axios from "axios";

const API = axios.create({
  baseURL: "https://chatnest-messenger.onrender.com",
  headers: {
    "Content-Type": "application/json",
  },
});

// =====================================
// TOKEN
// =====================================

const getToken = () => {
  return localStorage.getItem("token");
};


// =====================================
// AUTH
// =====================================

export const loginUser = async ({ email, password }) => {
  const response = await API.post("/auth/login", {
    email,
    password,
  });

  return response.data;
};


export const registerUser = async ({
  name,
  email,
  password,
}) => {
  const response = await API.post("/auth/register", {
    name,
    email,
    password,
  });

  return response.data;
};


// =====================================
// GET CURRENT USER
// =====================================

export const getCurrentUser = async () => {
  const token = getToken();

  const response = await API.get("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};


// =====================================
// GET ALL USERS
// =====================================

export const getUsers = async () => {
  const token = getToken();

  const response = await API.get("/messages/users", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};


// =====================================
// GET CHAT HISTORY
// =====================================

export const getMessages = async (userId) => {
  const token = getToken();

  const response = await API.get(
    `/messages/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};


// =====================================
// SEND MESSAGE
// =====================================

export const sendMessage = async ({
  receiver,
  content,
  messageType = "text",
}) => {
  const token = getToken();

  const response = await API.post(
    "/messages",
    {
      receiver,
      content,
      messageType,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};
// ======================================
// GROUPS
// ======================================

export const getGroups = async () => {
    const token = localStorage.getItem("token");

    const response = await API.get("/groups", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return response.data;
};

export const createGroup = async (groupData) => {
    const token = localStorage.getItem("token");

    const response = await API.post(
        "/groups",
        groupData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return response.data;
};


export default API;
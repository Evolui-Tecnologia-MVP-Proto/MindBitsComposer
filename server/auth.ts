import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored || !stored.includes(".")) {
      console.error("Formato de senha inválido:", stored);
      return false;
    }
    
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      console.error("Salt não encontrado na senha armazenada");
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Erro ao comparar senhas:", error);
    return false;
  }
}

// Define schema for login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Define schema for password change
const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
});

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "evo-mindbits-composer-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "E-mail ou senha inválidos" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register new user
  app.post("/api/register", async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "E-mail já está em uso" });
      }

      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      next(error);
    }
  });

  // Login
  app.post("/api/login", (req, res, next) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      passport.authenticate("local", (err, user, info) => {
        if (err) return next(err);
        if (!user) {
          return res.status(401).json({ message: info?.message || "E-mail ou senha inválidos" });
        }
        
        req.login(user, (err) => {
          if (err) return next(err);
          return res.status(200).json(user);
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      next(error);
    }
  });

  // Logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Change password
  app.post("/api/change-password", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    try {
      const passwordData = changePasswordSchema.parse(req.body);
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify current password
      const isValidPassword = await comparePasswords(
        passwordData.currentPassword,
        user.password
      );

      if (!isValidPassword) {
        return res.status(400).json({ message: "Senha atual incorreta" });
      }

      // Update password
      await storage.updateUserPassword(
        user.id,
        await hashPassword(passwordData.newPassword)
      );

      // If this was a first login password change, update the flag
      if (user.mustChangePassword) {
        await storage.updateUserMustChangePassword(user.id, false);
      }

      res.status(200).json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      next(error);
    }
  });

  // Update user profile
  app.patch("/api/user/profile", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    try {
      const { name, email } = req.body;
      
      // Check if email is already in use by another user
      if (email && email !== req.user.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ message: "E-mail já está em uso" });
        }
      }

      const updatedUser = await storage.updateUser(req.user.id, { name, email });
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  // User management endpoints (admin only)
  
  // Get all users (admin only)
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    try {
      const users = await storage.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Create new user (admin only)
  app.post("/api/users", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "E-mail já está em uso" });
      }

      // New users created by admin must change password on first login
      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password || "senha-inicial"),
        mustChangePassword: true,
      });

      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      next(error);
    }
  });

  // Update user status (admin only)
  app.patch("/api/users/:id/status", async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }

    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Acesso não autorizado" });
    }

    try {
      const userId = parseInt(req.params.id);
      const { status } = req.body;

      if (userId === req.user.id) {
        return res.status(400).json({ message: "Não é possível alterar o status do próprio usuário" });
      }

      const updatedUser = await storage.updateUserStatus(userId, status);
      res.status(200).json(updatedUser);
    } catch (error) {
      next(error);
    }
  });
}

import bcrypt from "bcryptjs";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import {
  verifyGoogleIdToken,
  verifyFacebookAccessToken,
  generateUnusablePassword,
} from "../services/social-auth.service.js";
import { getPublicSocialConfig } from "../config/social-auth.js";

/**
 * Social login.
 *
 * This is an ADDITIONAL authentication method. Email/password login, signup,
 * roles and the existing JWT session are untouched; a social login simply
 * produces the same token and the same user shape that /login returns, so
 * every protected route keeps working without knowing how the user signed in.
 *
 * Roles are NEVER read from the request and NEVER inferred from a provider.
 * A new social account is always created as "customer".
 */

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

/** Same payload shape as auth-controller's login/signup, so the frontend is unchanged. */
const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  // Social accounts have no phone; the frontend types this as string, so send
  // an empty string rather than null.
  phone: user.phone || "",
  role: user.role,
  points: user.points,
});

const respondWithSession = (res, user, message) =>
  res.status(200).json({
    status: "success",
    message,
    token: generateToken(user),
    data: { user: publicUser(user) },
  });

/**
 * Resolves a verified provider identity to a local account, or explains why it
 * cannot.
 *
 * Rules, in order:
 *  1. Identity already linked  -> that account signs in. Idempotent, so
 *     logging in twice never creates a second account.
 *  2. Provider email already used by an account that has a password
 *     -> do NOT link automatically. A provider email is not proof that the
 *     person owns the local account, so we stop and tell the user to sign in
 *     with their password and link explicitly.
 *  3. No conflict -> create a customer account.
 */
async function resolveSocialUser(provider, profile) {
  const { providerUserId, email, name, avatar } = profile;

  // 1. Already linked?
  const existing = await User.findOne({
    "socialAccounts.provider": provider,
    "socialAccounts.providerUserId": providerUserId,
  });

  if (existing) {
    // Keep the cached profile fresh, but never overwrite a real name/phone.
    const link = existing.socialAccounts.find(
      (s) => s.provider === provider && s.providerUserId === providerUserId
    );
    if (link) {
      if (name) link.name = name;
      if (avatar) link.avatar = avatar;
      if (email) link.email = email;
    }
    if (!existing.photo && avatar) existing.photo = avatar;
    await existing.save();
    return { user: existing, created: false };
  }

  // 2. Email collision with a password account -> refuse to auto-link.
  if (email) {
    const byEmail = await User.findOne({ email });
    if (byEmail) {
      const alreadyLinkedElsewhere = byEmail.socialAccounts?.some(
        (s) => s.provider === provider && s.providerUserId === providerUserId
      );
      if (!alreadyLinkedElsewhere) {
        const error = new Error(
          "An account already exists for this email. Sign in with your password to link it."
        );
        error.code = "ACCOUNT_LINK_REQUIRED";
        error.email = email;
        throw error;
      }
      return { user: byEmail, created: false };
    }
  }

  // 3. No verified email to identify a new account by. Facebook withholds the
  //    email unless the user grants it, and the local email is required and
  //    unique, so say so plainly instead of failing a schema validation.
  if (!email) {
    const error = new Error(
      "We could not read an email address from that account. Please allow email access and try again, or sign in with a password."
    );
    error.code = "EMAIL_REQUIRED";
    throw error;
  }

  // 4. Create a brand new customer.
  const hashed = await bcrypt.hash(generateUnusablePassword(), 10);

  const user = await User.create({
    name: name || email.split("@")[0],
    email,
    // Social accounts get a random 64-char password, so the existing bcrypt
    // login path is untouched and cannot be taken over with a guess.
    password: hashed,
    phone: null,
    photo: avatar || null,
    role: "customer",
    socialAccounts: [
      {
        provider,
        providerUserId,
        email: email || null,
        name: name || null,
        avatar: avatar || null,
        linkedAt: new Date(),
      },
    ],
  });

  return { user, created: true };
}

/** Maps a thrown error onto a status code and an Arabic-safe code for the UI. */
function handleSocialError(res, error) {
  switch (error.code) {
    case "PROVIDER_NOT_CONFIGURED":
      return res.status(503).json({
        status: "fail",
        code: error.code,
        message: "This sign-in method is not available right now.",
      });
    case "ACCOUNT_LINK_REQUIRED":
      return res.status(409).json({
        status: "fail",
        code: error.code,
        email: error.email,
        message:
          "An account already exists for this email. Sign in with your password to link it.",
      });
    case "EMAIL_NOT_VERIFIED":
      return res.status(401).json({
        status: "fail",
        code: error.code,
        message: "Your Google email is not verified.",
      });
    case "EMAIL_REQUIRED":
      return res.status(422).json({
        status: "fail",
        code: error.code,
        message:
          "We could not read an email address from that account. Please allow email access and try again, or sign in with a password.",
      });
    case "INVALID_TOKEN":
    default:
      return res.status(401).json({
        status: "fail",
        code: "INVALID_TOKEN",
        message: "That sign-in could not be verified. Please try again.",
      });
  }
}

// ---------------------------------------------------------------- endpoints

export const socialConfig = async (req, res) => {
  res.status(200).json({
    status: "success",
    data: getPublicSocialConfig(),
  });
};

export const googleLogin = async (req, res) => {
  try {
    const profile = await verifyGoogleIdToken(req.body?.credential);
    const { user, created } = await resolveSocialUser("google", profile);
    return respondWithSession(
      res,
      user,
      created ? "Account created with Google" : "Signed in with Google"
    );
  } catch (error) {
    return handleSocialError(res, error);
  }
};

export const facebookLogin = async (req, res) => {
  try {
    const profile = await verifyFacebookAccessToken(req.body?.accessToken);
    const { user, created } = await resolveSocialUser("facebook", profile);
    return respondWithSession(
      res,
      user,
      created ? "Account created with Facebook" : "Signed in with Facebook"
    );
  } catch (error) {
    return handleSocialError(res, error);
  }
};

/**
 * Explicit account linking.
 *
 * Requires BOTH a valid session (protect) and the account's current password,
 * so linking can never be triggered by someone who merely controls a provider
 * account with a matching email.
 */
export const linkSocialAccount = async (req, res) => {
  try {
    const { provider, password } = req.body || {};

    if (!["google", "facebook"].includes(provider)) {
      return res.status(400).json({
        status: "fail",
        message: "Unsupported provider",
      });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ status: "fail", message: "Account not found" });
    }

    const matches = await bcrypt.compare(String(password || ""), user.password);
    if (!matches) {
      return res.status(401).json({
        status: "fail",
        code: "PASSWORD_MISMATCH",
        message: "Password is incorrect",
      });
    }

    // Re-verify the provider token here too; the frontend's token from the
    // button click is not carried over.
    const profile =
      provider === "google"
        ? await verifyGoogleIdToken(req.body?.credential)
        : await verifyFacebookAccessToken(req.body?.accessToken);

    const taken = await User.findOne({
      "socialAccounts.provider": provider,
      "socialAccounts.providerUserId": profile.providerUserId,
      _id: { $ne: user._id },
    });

    if (taken) {
      return res.status(409).json({
        status: "fail",
        code: "IDENTITY_ALREADY_LINKED",
        message: "That social account is already linked to another user.",
      });
    }

    user.socialAccounts = (user.socialAccounts || []).filter(
      (s) => !(s.provider === provider && s.providerUserId === profile.providerUserId)
    );

    user.socialAccounts.push({
      provider,
      providerUserId: profile.providerUserId,
      email: profile.email || null,
      name: profile.name || null,
      avatar: profile.avatar || null,
      linkedAt: new Date(),
    });

    if (!user.photo && profile.avatar) user.photo = profile.avatar;

    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Social account linked",
      data: { user: publicUser(user) },
    });
  } catch (error) {
    return handleSocialError(res, error);
  }
};

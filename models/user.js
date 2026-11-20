import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    /**
     * Password login. Still REQUIRED, because a social account is given an
     * unguessable random hash so the existing bcrypt login path keeps working
     * unchanged and no social account can ever be taken over with a blank or
     * guessed password.
     */
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    /**
     * Identity verified by an external provider.
     *
     * The composite index makes (provider, providerUserId) unique, so one
     * provider identity can only ever map to one account. `providerUserId` is
     * Google's `sub` claim or Facebook's numeric user id - both are stable
     * identifiers assigned by the provider, never an email address.
     */
    socialAccounts: {
      type: [
        {
          _id: false,
          provider: {
            type: String,
            enum: ["google", "facebook"],
            required: true,
          },
          providerUserId: {
            type: String,
            required: true,
          },
          // The email exactly as the provider asserted it after server-side
          // verification. It is a snapshot, not the link used to log in.
          email: {
            type: String,
            lowercase: true,
            trim: true,
            default: null,
          },
          name: {
            type: String,
            trim: true,
            default: null,
          },
          avatar: {
            type: String,
            default: null,
          },
          linkedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    /**
     * Optional at the schema level because Google and Facebook do not return a
     * phone number. Email/password signup still REQUIRES it: signup() in
     * auth-controller.js rejects a missing phone explicitly, so this relaxation
     * only affects provider-created accounts.
     */
    phone: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ["admin", "staff", "customer"],
      default: "customer",
    },
points: {
  type: Number,
  default: 0,
  min: 0,
},
    photo: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

/**
 * One provider identity -> exactly one account.
 *
 * This is a database-level guarantee, not just an application check, so two
 * concurrent first-time logins with the same Google account cannot race and
 * create duplicates. `background: true` keeps it from blocking startup, and
 * existing documents have no `socialAccounts` so they are never affected.
 */
User.schema.index(
  { "socialAccounts.provider": 1, "socialAccounts.providerUserId": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "socialAccounts.provider": { $type: "string" },
    },
    background: true,
    name: "uniq_provider_identity",
  }
);

export default User;
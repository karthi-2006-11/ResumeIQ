const mongoose = require('mongoose');

/**
 * User Account Mongoose Model
 * Privacy Rule: NEVER STORE PLAINTEXT PASSWORDS, RESUME BUFFERS, OR RAW TEXT.
 */
const UserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Email address is required'],
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        passwordHash: {
            type: String,
            required: [true, 'Password hash is required']
        }
    },
    {
        timestamps: true
    }
);

// Transform output JSON to delete sensitive passwordHash and expose clean id
UserSchema.set('toJSON', {
    transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
    }
});

module.exports = mongoose.model('User', UserSchema);

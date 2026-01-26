import { Link } from "react-router-dom";

export default function DocsProfile() {
    return (
        <div className="prose prose-lg max-w-none">
            <h1>Profile Settings</h1>

            <h2>Updating Your Profile</h2>
            <p>
                You can update your profile information from the <Link to="/dashboard/settings">Settings page</Link> in your dashboard.
            </p>

            <h3>Profile Information</h3>
            <p>You can update the following information:</p>
            <ul>
                <li>Full name</li>
                <li>Profile picture (avatar)</li>
                <li>Email address</li>
            </ul>

            <h2>Changing Your Password</h2>
            <p>
                To change your password, go to the Settings page and enter your new password. You'll need to enter the new password twice to confirm it.
            </p>

            <h3>Password Requirements</h3>
            <ul>
                <li>Minimum 8 characters</li>
                <li>We recommend using a mix of letters, numbers, and symbols</li>
            </ul>

            <h2>Forgot Your Password?</h2>
            <p>
                If you've forgotten your password, you can reset it from the <Link to="/forgot-password">Forgot Password page</Link>. Enter your email address and we'll send you a reset link.
            </p>

            <h2>Deleting Your Account</h2>
            <p>
                If you wish to delete your account, you can do so from the Settings page. Please note that this action is permanent and cannot be undone. All your data will be deleted.
            </p>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-6 not-prose">
                <p className="text-red-600 font-medium m-0">
                    ⚠️ Account deletion is permanent. Make sure to export any data you need before deleting your account.
                </p>
            </div>
        </div>
    );
}

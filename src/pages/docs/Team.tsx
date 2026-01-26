import { Link } from "react-router-dom";

export default function DocsTeam() {
    return (
        <div className="prose prose-lg max-w-none">
            <h1>Team Management</h1>

            <h2>Inviting Team Members</h2>
            <p>
                You can invite new team members from the <Link to="/dashboard/team">Team page</Link> in your dashboard.
            </p>

            <h3>How to Invite</h3>
            <ol>
                <li>Go to the Team page in your dashboard</li>
                <li>Enter the email address of the person you want to invite</li>
                <li>Click "Invite"</li>
                <li>The invitee will receive an email with instructions to join</li>
            </ol>

            <h3>Invitation Expiration</h3>
            <p>
                Invitations are valid for 7 days. If the invitation expires, you can send a new one from the Team page.
            </p>

            <h2>Team Roles</h2>
            <p>There are several roles available for team members:</p>
            <ul>
                <li><strong>Owner</strong> - Full access to all features, billing, and team management</li>
                <li><strong>Admin</strong> - Can manage team members and access all features</li>
                <li><strong>Member</strong> - Standard access to the platform</li>
            </ul>

            <h3>Changing Roles</h3>
            <p>
                Owners and admins can change team member roles from the Team page. Click on a team member and select their new role.
            </p>

            <h2>Removing Team Members</h2>
            <p>
                To remove a team member, go to the Team page, find the member you want to remove, and click "Remove". They will immediately lose access to the workspace.
            </p>

            <h2>Team Limits</h2>
            <p>
                The number of team members you can have depends on your plan. Check the <Link to="/pricing">Pricing page</Link> for details on team member limits.
            </p>
        </div>
    );
}

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-primary">404</h1>
                <p className="mt-4 text-xl text-muted-foreground">Page not found</p>
                <p className="mt-2 text-muted-foreground">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Button className="mt-8" asChild>
                    <Link to="/">Go Home</Link>
                </Button>
            </div>
        </div>
    );
}

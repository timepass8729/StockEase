import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Package } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import bcrypt from "bcryptjs";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [securityQuestion1, setSecurityQuestion1] = useState("");
  const [securityAnswer1, setSecurityAnswer1] = useState("");
  const [securityQuestion2, setSecurityQuestion2] = useState("");
  const [securityAnswer2, setSecurityAnswer2] = useState("");
  const [securityQuestion3, setSecurityQuestion3] = useState("");
  const [securityAnswer3, setSecurityAnswer3] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const securityQuestions = [
    "What was the name of your first pet?",
    "In which city were you born?",
    "What was your mother's maiden name?",
    "What was the name of your elementary school?",
    "What is your favorite movie?",
    "What was the make of your first car?",
    "What is your favorite food?",
    "What was your childhood nickname?"
  ];

  const checkAdminExists = async () => {
    try {
      const usersQuery = query(collection(db, "users"), where("role", "==", "admin"));
      const querySnapshot = await getDocs(usersQuery);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking admin existence:", error);
      return false;
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords match.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2 || !securityQuestion3 || !securityAnswer3) {
      toast({
        title: "Security Questions Required",
        description: "Please answer all three security questions.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Check if admin already exists when trying to register as admin
    if (role === "admin") {
      const adminExists = await checkAdminExists();
      if (adminExists) {
        toast({
          title: "Admin Already Exists",
          description: "An admin already exists. Only one admin is allowed in the system.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }
    }

    try {
      const userCredential = await registerUser(email, password);
      const user = userCredential.user;
      
      // Hash the security answers
      const hashedAnswer1 = await bcrypt.hash(securityAnswer1.toLowerCase().trim(), 10);
      const hashedAnswer2 = await bcrypt.hash(securityAnswer2.toLowerCase().trim(), 10);
      const hashedAnswer3 = await bcrypt.hash(securityAnswer3.toLowerCase().trim(), 10);
      
      // Store user role and security questions in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: role,
        createdAt: new Date(),
        securityQuestions: {
          question1: securityQuestion1,
          answer1: hashedAnswer1,
          question2: securityQuestion2,
          answer2: hashedAnswer2,
          question3: securityQuestion3,
          answer3: hashedAnswer3,
        }
      });

      // If registering as admin, update system status
      if (role === "admin") {
        await setDoc(doc(db, "system", "adminStatus"), {
          adminExists: true,
          adminId: user.uid,
          lastUpdated: new Date(),
        });
      }

      toast({
        title: "Account Created",
        description: "Your account has been successfully created!",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-stockease-50 to-stockease-100">
      <div className="w-full max-w-md p-4">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1 flex flex-col items-center">
            <div className="flex items-center justify-center rounded-lg bg-stockease-100 p-2 mb-2">
              <Package className="h-8 w-8 text-stockease-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Register for a StockEase account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Account Type</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Security Questions */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700">Security Questions (for password recovery)</h3>
                
                <div className="space-y-2">
                  <Label>Question 1</Label>
                  <Select value={securityQuestion1} onValueChange={setSecurityQuestion1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a security question" />
                    </SelectTrigger>
                    <SelectContent>
                      {securityQuestions.map((question, index) => (
                        <SelectItem key={index} value={question}>{question}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={securityAnswer1}
                    onChange={(e) => setSecurityAnswer1(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Question 2</Label>
                  <Select value={securityQuestion2} onValueChange={setSecurityQuestion2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a security question" />
                    </SelectTrigger>
                    <SelectContent>
                      {securityQuestions.map((question, index) => (
                        <SelectItem key={index} value={question}>{question}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={securityAnswer2}
                    onChange={(e) => setSecurityAnswer2(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Question 3</Label>
                  <Select value={securityQuestion3} onValueChange={setSecurityQuestion3}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a security question" />
                    </SelectTrigger>
                    <SelectContent>
                      {securityQuestions.map((question, index) => (
                        <SelectItem key={index} value={question}>{question}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    placeholder="Your answer"
                    value={securityAnswer3}
                    onChange={(e) => setSecurityAnswer3(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-stockease-600 hover:bg-stockease-700" 
                disabled={isLoading}
              >
                {isLoading ? "Creating account..." : "Register"}
              </Button>
              <p className="text-sm text-center text-gray-500">
                Already have an account?{" "}
                <Link to="/login" className="text-stockease-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Register;

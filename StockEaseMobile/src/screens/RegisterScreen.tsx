import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { registerUser, db } from '../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import bcrypt from 'bcryptjs';

const RegisterScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Security questions
  const [securityQuestion1, setSecurityQuestion1] = useState('');
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  const [securityQuestion3, setSecurityQuestion3] = useState('');
  const [securityAnswer3, setSecurityAnswer3] = useState('');
  
  const navigation = useNavigation();

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

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2 || !securityQuestion3 || !securityAnswer3) {
      Alert.alert('Error', 'Please answer all three security questions');
      return;
    }

    if (role === 'admin') {
      const adminExists = await checkAdminExists();
      if (adminExists) {
        Alert.alert('Error', 'An admin already exists. Only one admin is allowed in the system.');
        return;
      }
    }

    setIsLoading(true);
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

      Alert.alert('Success', 'Account created successfully!');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Registration Failed', error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0284c7', '#0369a1', '#075985']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <Ionicons name="cube" size={60} color="white" />
            <Text style={styles.logoText}>Create Account</Text>
            <Text style={styles.tagline}>Join StockEase</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Account Type</Text>
              <Picker
                selectedValue={role}
                onValueChange={setRole}
                style={styles.picker}
              >
                <Picker.Item label="Employee" value="employee" />
                <Picker.Item label="Admin" value="admin" />
              </Picker>
            </View>

            <Text style={styles.sectionTitle}>Security Questions</Text>
            
            {/* Security Question 1 */}
            <View style={styles.securityQuestionContainer}>
              <Text style={styles.questionLabel}>Question 1</Text>
              <Picker
                selectedValue={securityQuestion1}
                onValueChange={setSecurityQuestion1}
                style={styles.questionPicker}
              >
                <Picker.Item label="Select a question..." value="" />
                {securityQuestions.map((question, index) => (
                  <Picker.Item key={index} label={question} value={question} />
                ))}
              </Picker>
              <TextInput
                style={styles.answerInput}
                placeholder="Your answer"
                value={securityAnswer1}
                onChangeText={setSecurityAnswer1}
                placeholderTextColor="#666"
              />
            </View>

            {/* Security Question 2 */}
            <View style={styles.securityQuestionContainer}>
              <Text style={styles.questionLabel}>Question 2</Text>
              <Picker
                selectedValue={securityQuestion2}
                onValueChange={setSecurityQuestion2}
                style={styles.questionPicker}
              >
                <Picker.Item label="Select a question..." value="" />
                {securityQuestions.map((question, index) => (
                  <Picker.Item key={index} label={question} value={question} />
                ))}
              </Picker>
              <TextInput
                style={styles.answerInput}
                placeholder="Your answer"
                value={securityAnswer2}
                onChangeText={setSecurityAnswer2}
                placeholderTextColor="#666"
              />
            </View>

            {/* Security Question 3 */}
            <View style={styles.securityQuestionContainer}>
              <Text style={styles.questionLabel}>Question 3</Text>
              <Picker
                selectedValue={securityQuestion3}
                onValueChange={setSecurityQuestion3}
                style={styles.questionPicker}
              >
                <Picker.Item label="Select a question..." value="" />
                {securityQuestions.map((question, index) => (
                  <Picker.Item key={index} label={question} value={question} />
                ))}
              </Picker>
              <TextInput
                style={styles.answerInput}
                placeholder="Your answer"
                value={securityAnswer3}
                onChangeText={setSecurityAnswer3}
                placeholderTextColor="#666"
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, isLoading && styles.disabledButton]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.registerButtonText}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login' as never)}
            >
              <Text style={styles.loginText}>
                Already have an account? <Text style={styles.loginLinkText}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 5,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  picker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  securityQuestionContainer: {
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  questionPicker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
  },
  answerInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  registerButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#0284c7',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLinkText: {
    color: '#0284c7',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
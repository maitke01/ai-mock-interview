// LaTeX-inspired Resume Templates
// Converted to editable HTML format for Quill editor

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  content: string; // Single content field instead of separate sections
}

export const latexTemplates: ResumeTemplate[] = [
  {
    id: 'iiitv-template',
    name: 'IIITV Academic Template',
    description: 'Professional academic template with sections for education, experience, projects, and skills',
    content: `<p style="text-align: center; margin-bottom: 0;"><strong style="font-size: 28px;">Your Name</strong></p>
<p style="text-align: center; margin: 2px 0; font-size: 11px;">Roll No.: xxxxxxx &nbsp;&nbsp;|&nbsp;&nbsp; Your Program &nbsp;&nbsp;|&nbsp;&nbsp; Your Course</p>
<p style="text-align: center; margin: 2px 0; font-size: 11px;">📞 +91-xxxxxxxxxx &nbsp;&nbsp;|&nbsp;&nbsp; ✉️ youremail@email.com &nbsp;&nbsp;|&nbsp;&nbsp; officialemail@iiitvadodara.ac.in</p>
<p style="text-align: center; margin: 2px 0; font-size: 11px;">🔗 <a href="https://github.com/yourprofile">GitHub Profile</a> &nbsp;&nbsp;|&nbsp;&nbsp; <a href="https://linkedin.com/in/yourprofile">LinkedIn Profile</a></p>
<p style="text-align: center; margin: 2px 0; font-size: 11px; font-style: italic;">Indian Institute Of Information Technology, Vadodara</p>
<p><br></p>

<p style="font-size: 16px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 3px; margin-top: 20px; margin-bottom: 8px;">Education</p>
<ul style="margin-top: 5px; margin-bottom: 15px;">
  <li style="margin-bottom: 8px;"><strong>Indian Institute of Information Technology, Vadodara</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Year<br><em>Your Degree and Course name</em> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CGPA/Percentage: xxx</li>
  <li style="margin-bottom: 8px;"><strong>Your School Name</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Year<br><em>Board of Intermediate Education, State</em> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CGPA/Percentage: xxx</li>
  <li style="margin-bottom: 8px;"><strong>Your School name</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Year<br><em>Board of Secondary Education, State</em> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CGPA/Percentage: xxx</li>
</ul>

<p style="font-size: 16px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 3px; margin-top: 20px; margin-bottom: 8px;">Experience</p>
<ul style="margin-top: 5px; margin-bottom: 15px;">
  <li style="margin-bottom: 10px;"><strong>Company Name</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Event dates<br><em>Your Role</em> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; City<br>&nbsp;&nbsp;&nbsp;&nbsp;– Work description line 1<br>&nbsp;&nbsp;&nbsp;&nbsp;– Work description line 2</li>
  <li style="margin-bottom: 10px;"><strong>Company Name</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Event dates<br><em>Your Role</em> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; City<br>&nbsp;&nbsp;&nbsp;&nbsp;– Work description line 1<br>&nbsp;&nbsp;&nbsp;&nbsp;– Work description line 2</li>
</ul>

<p style="font-size: 16px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 3px; margin-top: 20px; margin-bottom: 8px;">Personal Projects</p>
<ul style="margin-top: 5px; margin-bottom: 15px;">
  <li style="margin-bottom: 10px;"><strong>Project Name</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Event dates<br>Project description (Your input in the project)<br>&nbsp;&nbsp;&nbsp;&nbsp;– Tools & technologies used: xxx, xxx<br>&nbsp;&nbsp;&nbsp;&nbsp;– More description on the project (The output you achieved by working on the project)</li>
  <li style="margin-bottom: 10px;"><strong>Project Name</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Event dates<br>Project description (Your input in the project)<br>&nbsp;&nbsp;&nbsp;&nbsp;– Tools & technologies used: xxx, xxx<br>&nbsp;&nbsp;&nbsp;&nbsp;– More description on the project (The output you achieved by working on the project)</li>
</ul>

<p style="font-size: 16px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 3px; margin-top: 20px; margin-bottom: 8px;">Technical Skills and Interests</p>
<p style="margin: 5px 0;"><strong>Languages:</strong> </p>
<p style="margin: 5px 0;"><strong>Developer Tools:</strong> </p>
<p style="margin: 5px 0;"><strong>Frameworks:</strong> </p>
<p style="margin: 5px 0;"><strong>Cloud/Databases:</strong> </p>
<p style="margin: 5px 0;"><strong>Soft Skills:</strong> </p>
<p style="margin: 5px 0;"><strong>Coursework:</strong> </p>
<p style="margin: 5px 0;"><strong>Areas of Interest:</strong> </p>
<p><br></p>

<p style="font-size: 16px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 3px; margin-top: 20px; margin-bottom: 8px;">Positions of Responsibility</p>
<ul style="margin-top: 5px; margin-bottom: 15px;">
  <li><strong>Position</strong>, Club or Event &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Position tenure</li>
  <li><strong>Position</strong>, Club or Event &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Position tenure</li>
</ul>

<p style="font-size: 16px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 3px; margin-top: 20px; margin-bottom: 8px;">Achievements</p>
<ul style="margin-top: 5px; margin-bottom: 15px;">
  <li><strong>Achievement</strong> description &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Event dates</li>
  <li><strong>Achievement</strong> description &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Event dates</li>
</ul>`
  },
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Clean and modern design with header, meta section, and detailed experience',
    content: `<p style="text-align: center; margin-bottom: 0;"><strong style="font-size: 36px;">JOHN DOE</strong></p>
<p style="text-align: center; margin: 5px 0; font-size: 18px; font-weight: bold;">RESUME</p>
<p style="text-align: center; margin: 3px 0; font-size: 12px;">Software Developer | Prague, Czech Republic</p>
<p style="text-align: center; margin: 3px 0; font-size: 12px;">📧 john.doe@gmail.com | 📞 +420 123 456 789</p>
<p><br></p>

<p style="background-color: #5a5a78; color: white; padding: 8px; font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">META</p>
<p style="margin: 3px 0;"><strong>Status:</strong> Developer at The Company, M.Sc. in Computer Science</p>
<p style="margin: 3px 0;"><strong>Skills:</strong> Java, C#/.Net, C++, Python, JavaScript, Ruby, Bash, SQL</p>
<p style="margin: 3px 0;"><strong>Interests:</strong> Data Warehouses, Data Lakes, Data Analysis, Data Quality</p>
<p style="margin: 3px 0;"><strong>Activities:</strong> Hockey, Football, Tennis, Basketball, Reading, Music</p>
<p><br></p>

<p style="background-color: #5a5a78; color: white; padding: 8px; font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">SUMMARY</p>
<p style="margin: 5px 0;">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque gravida ligula sed rhoncus lobortis. Pellentesque sit amet sapien in neque cursus mollis. Nulla aliquet mauris ac enim fermentum tincidunt.</p>
<p><br></p>

<p style="background-color: #5a5a78; color: white; padding: 8px; font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">EXPERIENCE</p>
<p style="margin: 10px 0 5px 0;"><strong>Developer</strong> | <em>The Company</em> | 2016/01 - now</p>
<ul style="margin: 5px 0 15px 20px;">
  <li style="margin-bottom: 3px;">Proin laoreet dolor vitae velit tristique, id interdum augue finibus</li>
  <li style="margin-bottom: 3px;">Erat at purus facilisis vestibulum pulvinar sit amet felis</li>
  <li style="margin-bottom: 3px;">Lorem consectetur elementum, aliquam facilisis ante id magna porta</li>
  <li style="margin-bottom: 3px;">Morbi sit amet ullamcorper felis fusce nec mi ac nisi cursus aliquet</li>
</ul>
<p style="margin: 10px 0 5px 0;"><strong>Developer</strong> | <em>The Older Company</em> | 2015/01 - 2015/12</p>
<ul style="margin: 5px 0 15px 20px;">
  <li style="margin-bottom: 3px;">Praesent aliquam sagittis hendrerit phasellus efficitur tincidunt</li>
  <li style="margin-bottom: 3px;">Amet eget augue nam quis sapien eget arcu placerat lobortis</li>
  <li style="margin-bottom: 3px;">Eget lacus nec dolor sagittis efficitur aliquam nec metus</li>
</ul>

<p style="background-color: #5a5a78; color: white; padding: 8px; font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">EDUCATION</p>
<p style="margin: 10px 0 5px 0;"><strong>Master's Degree, Computer Science</strong> | <em>The University</em> | 2013 - 2016</p>
<ul style="margin: 5px 0 15px 20px;">
  <li style="margin-bottom: 3px;"><strong>Thesis:</strong> Vestibulum Vel Lorem Ex Duis Varius Lorem Iaculis</li>
  <li style="margin-bottom: 3px;">Dignissim malesuada vestibulum sed eget elit justo aliquam</li>
  <li style="margin-bottom: 3px;">Donec mattis, purus vel pellentesque maximus tellus arcu</li>
</ul>
<p style="margin: 10px 0 5px 0;"><strong>Bachelor's Degree, Computer Science</strong> | <em>The University</em> | 2009 - 2013</p>
<ul style="margin: 5px 0 15px 20px;">
  <li style="margin-bottom: 3px;"><strong>Thesis:</strong> Duis Molestie Faucibus Ligula Sed Suscipit Tellus</li>
  <li style="margin-bottom: 3px;">Accumsan ligula at feugiat donec gravida odio ac sodales</li>
</ul>`
  },
  {
    id: 'awesome-cv',
    name: 'Awesome CV',
    description: 'Stylish template with photo placeholder and comprehensive sections',
    content: `<p style="text-align: center; margin-bottom: 0;"><strong style="font-size: 32px; color: #2c3e50;">Christophe Roger</strong></p>
<p style="text-align: center; margin: 3px 0; font-size: 14px; color: #666;">Architecte Logiciel | Développeur/Concepteur Java/JEE</p>
<p style="text-align: center; margin: 2px 0; font-size: 11px;">🔗 <a href="https://linkedin.com/in/christopheroger">LinkedIn: christopheroger</a> | <a href="https://github.com/darwiin">GitHub: darwiin</a></p>
<p style="text-align: center; margin: 2px 0; font-size: 11px;">📱 +687 123 456 | ✉️ christophe.roger@mail.com</p>
<p style="text-align: center; margin: 2px 0; font-size: 11px;">📍 2 Rue du quartier, 98765 Ville, Pays</p>
<p style="text-align: center; margin: 2px 0; font-size: 10px; font-style: italic; color: #888;">Né le 23 septembre 1982 (35 ans) à Nouméa, Nouvelle-Calédonie</p>
<p><br></p>

<p style="font-size: 18px; font-weight: bold; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">HEADLINE</p>
<p style="margin: 5px 0;">Brief professional headline or objective statement goes here.</p>
<p><br></p>

<p style="font-size: 18px; font-weight: bold; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">COMPÉTENCES</p>
<ul style="margin: 5px 0 15px 20px;">
  <li style="margin-bottom: 5px;"><strong>Programming:</strong> Java, JavaScript, Python, C++</li>
  <li style="margin-bottom: 5px;"><strong>Frameworks:</strong> Spring, React, Angular</li>
  <li style="margin-bottom: 5px;"><strong>Databases:</strong> MySQL, PostgreSQL, MongoDB</li>
  <li style="margin-bottom: 5px;"><strong>Tools:</strong> Git, Docker, Kubernetes</li>
</ul>

<p style="font-size: 18px; font-weight: bold; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">EXPÉRIENCE PROFESSIONNELLE</p>
<p style="margin: 10px 0 3px 0;"><strong>Senior Developer</strong> | <em>Company Name</em></p>
<p style="margin: 0; font-size: 11px; color: #666;">January 2020 - Present | Paris, France</p>
<ul style="margin: 5px 0 15px 20px;">
  <li style="margin-bottom: 3px;">Led development of microservices architecture</li>
  <li style="margin-bottom: 3px;">Mentored junior developers and conducted code reviews</li>
  <li style="margin-bottom: 3px;">Improved system performance by 40%</li>
</ul>
<p style="margin: 10px 0 3px 0;"><strong>Developer</strong> | <em>Previous Company</em></p>
<p style="margin: 0; font-size: 11px; color: #666;">June 2017 - December 2019 | Paris, France</p>
<ul style="margin: 5px 0 15px 20px;">
  <li style="margin-bottom: 3px;">Developed and maintained web applications</li>
  <li style="margin-bottom: 3px;">Collaborated with cross-functional teams</li>
  <li style="margin-bottom: 3px;">Implemented CI/CD pipelines</li>
</ul>

<p style="font-size: 18px; font-weight: bold; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">FORMATION</p>
<p style="margin: 10px 0 3px 0;"><strong>Master's Degree in Computer Science</strong></p>
<p style="margin: 0; font-size: 11px; color: #666;"><em>University Name</em> | 2015 - 2017</p>
<p><br></p>
<p style="margin: 10px 0 3px 0;"><strong>Bachelor's Degree in Computer Science</strong></p>
<p style="margin: 0; font-size: 11px; color: #666;"><em>University Name</em> | 2012 - 2015</p>
<p><br></p>

<p style="font-size: 18px; font-weight: bold; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">PROJETS</p>
<p style="margin: 10px 0 3px 0;"><strong>Project Name</strong> | <em>Role</em> | Year</p>
<p style="margin: 3px 0;">Description of the project and your contributions</p>
<ul style="margin: 5px 0 15px 20px;">
  <li style="margin-bottom: 3px;">Key achievement or feature 1</li>
  <li style="margin-bottom: 3px;">Key achievement or feature 2</li>
</ul>

<p style="font-size: 18px; font-weight: bold; color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">LANGUES</p>
<ul style="margin: 5px 0 15px 20px;">
  <li style="margin-bottom: 5px;"><strong>French:</strong> Native</li>
  <li style="margin-bottom: 5px;"><strong>English:</strong> Fluent</li>
  <li style="margin-bottom: 5px;"><strong>Spanish:</strong> Intermediate</li>
</ul>`
  }
];

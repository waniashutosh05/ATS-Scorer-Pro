// Setup PDF.js worker
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

document.addEventListener('DOMContentLoaded', () => {
    const scoreBtn = document.getElementById('score-btn');
    const resultsSection = document.getElementById('results-section');
    const jdInput = document.getElementById('job-description');
    const resumeInput = document.getElementById('resume-text');
    
    // Tabs functionality
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Find the parent input-card to scope the tab switching
            const parentCard = btn.closest('.input-card');
            const cardTabBtns = parentCard.querySelectorAll('.tab-btn');
            const cardTabContents = parentCard.querySelectorAll('.tab-content');

            // Remove active class from all in this card
            cardTabBtns.forEach(b => b.classList.remove('active'));
            cardTabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // PDF Upload functionality
    function setupPdfUpload(uploadAreaId, uploadInputId, uploadTextId, fileNameId, loadingId, targetTextareaId, tabTargetAttr) {
        const uploadArea = document.getElementById(uploadAreaId);
        const pdfUpload = document.getElementById(uploadInputId);
        const uploadText = document.getElementById(uploadTextId);
        const fileNameDisplay = document.getElementById(fileNameId);
        const pdfLoading = document.getElementById(loadingId);
        const targetTextarea = document.getElementById(targetTextareaId);

        // Drag and Drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
        });

        uploadArea.addEventListener('drop', (e) => {
            let dt = e.dataTransfer;
            let files = dt.files;
            handleFiles(files);
        });

        pdfUpload.addEventListener('change', function() {
            handleFiles(this.files);
        });

        function handleFiles(files) {
            if (files.length === 0) return;
            const file = files[0];
            if (file.type !== 'application/pdf') {
                alert('Please upload a valid PDF file.');
                return;
            }

            fileNameDisplay.textContent = file.name;
            uploadText.textContent = "Selected File:";
            extractTextFromPDF(file);
        }

        async function extractTextFromPDF(file) {
            if (typeof pdfjsLib === 'undefined') {
                alert("PDF.js library is not loaded properly. Check your internet connection.");
                return;
            }

            pdfLoading.classList.remove('hidden');

            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
                
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                // Switch to text tab and populate it
                targetTextarea.value = fullText;
                // Click the tab specific to this input card
                targetTextarea.closest('.input-card').querySelector(`.tab-btn[data-target="${tabTargetAttr}"]`).click();
                
            } catch (error) {
                console.error("Error extracting PDF text:", error);
                alert("Failed to read PDF. It might be corrupted or scanned. Please paste text directly.");
            } finally {
                pdfLoading.classList.add('hidden');
            }
        }
    }

    // Setup both upload areas
    setupPdfUpload('upload-area', 'pdf-upload', 'upload-text', 'file-name', 'pdf-loading', 'resume-text', 'resume-text');
    setupPdfUpload('jd-upload-area', 'jd-pdf-upload', 'jd-upload-text', 'jd-file-name', 'jd-pdf-loading', 'job-description', 'job-description');


    // Progress Ring Setup
    const circle = document.querySelector('.progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;
    
    function setProgress(percent) {
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    // Stop words to ignore during keyword extraction
    const stopWords = new Set([
        'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it',
        'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these',
        'they', 'this', 'to', 'was', 'will', 'with', 'you', 'your', 'we', 'our', 'from', 'can', 'have',
        'has', 'had', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'any',
        'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'nor', 'too', 'very', 'can',
        'will', 'just', 'should', 'now'
    ]);

    function extractKeywords(text) {
        if (!text) return [];
        // Convert to lowercase, remove punctuation except periods and hyphens in words, split by whitespace
        const words = text.toLowerCase()
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word) && !/^\d+$/.test(word));
        
        // Count frequency
        const freqMap = {};
        words.forEach(word => {
            freqMap[word] = (freqMap[word] || 0) + 1;
        });

        return Object.keys(freqMap);
    }

    function analyzeText() {
        const jdText = jdInput.value.trim();
        // Always use whatever is currently in the text area, since PDF extraction auto-fills it
        const resumeTextToUse = resumeInput.value.trim();

        if (!jdText) {
            alert('Please paste the Job Description.');
            return;
        }

        if (!resumeTextToUse) {
            alert('Please paste your Resume text or upload a PDF.');
            return;
        }

        // Animate button
        scoreBtn.classList.add('loading');
        scoreBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
            <span>Analyzing...</span>
        `;

        // Simulate network delay for UX
        setTimeout(() => {
            const jdKeywords = extractKeywords(jdText);
            const resumeKeywords = extractKeywords(resumeTextToUse);
            
            // Top 30 most important words from JD (simulated)
            const targetKeywords = jdKeywords.slice(0, 30);
            
            const matched = [];
            const missing = [];

            targetKeywords.forEach(keyword => {
                if (resumeKeywords.includes(keyword)) {
                    matched.push(keyword);
                } else {
                    missing.push(keyword);
                }
            });

            // Calculate Score
            let score = 0;
            if (targetKeywords.length > 0) {
                score = Math.round((matched.length / targetKeywords.length) * 100);
            }

            renderResults(score, matched, missing);

            // Reset button
            scoreBtn.classList.remove('loading');
            scoreBtn.innerHTML = `
                <span>Analyze Match</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            `;
        }, 1200);
    }

    function renderResults(score, matched, missing) {
        // Show section
        resultsSection.classList.remove('hidden');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Animate score number
        const scoreElement = document.getElementById('score-number');
        let currentScore = 0;
        const duration = 1000;
        const interval = 20;
        const steps = duration / interval;
        const increment = score / steps;

        const timer = setInterval(() => {
            currentScore += increment;
            if (currentScore >= score) {
                clearInterval(timer);
                currentScore = score;
            }
            scoreElement.textContent = Math.round(currentScore);
        }, interval);

        // Animate circle
        setTimeout(() => {
            setProgress(score);
        }, 100);

        // Update titles based on score
        const scoreTitle = document.getElementById('score-title');
        const scoreSubtitle = document.getElementById('score-subtitle');
        if (score >= 80) {
            scoreTitle.textContent = 'Excellent Match';
            scoreTitle.style.color = 'var(--success)';
            scoreSubtitle.textContent = 'Your resume is highly optimized for this role.';
        } else if (score >= 50) {
            scoreTitle.textContent = 'Good Match';
            scoreTitle.style.color = '#fbbf24'; // Yellow
            scoreSubtitle.textContent = 'You meet many requirements, but some key terms are missing.';
        } else {
            scoreTitle.textContent = 'Needs Improvement';
            scoreTitle.style.color = 'var(--error)';
            scoreSubtitle.textContent = 'Consider adding the missing keywords below to your resume.';
        }

        // Render tags
        document.getElementById('matched-count').textContent = matched.length;
        document.getElementById('missing-count').textContent = missing.length;

        const matchedContainer = document.getElementById('matched-keywords');
        const missingContainer = document.getElementById('missing-keywords');
        
        matchedContainer.innerHTML = '';
        missingContainer.innerHTML = '';

        matched.forEach((word, index) => {
            const span = document.createElement('span');
            span.className = 'tag match';
            span.textContent = word;
            span.style.animationDelay = `${index * 0.05}s`;
            matchedContainer.appendChild(span);
        });

        missing.forEach((word, index) => {
            const span = document.createElement('span');
            span.className = 'tag missing';
            span.textContent = word;
            span.style.animationDelay = `${index * 0.05}s`;
            missingContainer.appendChild(span);
        });

        // Generate Advice
        const adviceList = document.getElementById('advice-list');
        adviceList.innerHTML = ''; // clear old advice
        
        const advices = [];
        
        if (score >= 80) {
            advices.push("Your resume is highly optimized for this role! Ensure your formatting is clean (standard fonts, no complex tables) before submitting.");
            if (missing.length > 0) {
                advices.push(`To make it 100% bulletproof, try to naturally weave in these terms: <strong>${missing.slice(0, 3).join(', ')}</strong>.`);
            }
        } else if (score >= 50) {
            advices.push("You have a good foundation, but ATS systems are strict. Try to rephrase your bullet points to exactly match the job description's phrasing.");
            if (missing.length > 0) {
                advices.push(`Your biggest missing opportunities are: <strong>${missing.slice(0, 3).join(', ')}</strong>. Try adding them to your "Skills" section or recent job experience.`);
            }
            advices.push("Avoid using generic terms. Replace them with specific metrics and the exact keywords listed above.");
        } else {
            advices.push("Your resume is missing many core keywords. You should tailor your resume specifically for this job description rather than using a generic one.");
            if (missing.length > 0) {
                advices.push(`Start by adding these highly important terms to your Summary and Skills sections: <strong>${missing.slice(0, 4).join(', ')}</strong>.`);
            }
            advices.push("Consider reading through the job description again and mapping your past experiences directly to their required responsibilities.");
        }

        // Add general advice
        advices.push("Save your final resume as a standard PDF format to preserve formatting across different ATS platforms.");

        advices.forEach((text, index) => {
            const li = document.createElement('li');
            li.innerHTML = text;
            li.style.animation = `fadeIn 0.5s ease-out ${index * 0.1}s forwards`;
            li.style.opacity = '0'; // For animation
            adviceList.appendChild(li);
        });
    }

    scoreBtn.addEventListener('click', analyzeText);
});

// UI rendering and interactions
let currentEditingTaskId = null;
let draggedTaskId = null;
let dragStartPosition = null; // Store initial drag position
let selectedTasks = new Set(); // Track selected tasks for bulk editing

// Render day buckets with dates
function renderDayBuckets() {
    // Note: movePastDayTasksForward() is called in loadTasks() and saveAndRender()
    // to avoid calling it multiple times during rendering
    
    // Get the current date/time and check if it's after 7pm
    // If after 7pm, treat it as the next day for bucket visibility
    const now = new Date();
    const currentHour = now.getHours();
    const isAfter7PM = currentHour >= 19; // 7pm = 19:00
    
    // Get the effective day (if after 7pm, use next day)
    let effectiveDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    if (isAfter7PM && effectiveDay >= 1 && effectiveDay <= 5) {
        // After 7pm on a weekday, treat as next day
        effectiveDay = effectiveDay + 1;
        if (effectiveDay === 6) {
            // Friday after 7pm = Saturday, show all next week
            effectiveDay = 0; // Treat as Sunday for display purposes
        }
    }
    
    // Map effective day to day bucket index (Monday=0, Tuesday=1, etc.)
    // Convert Sunday (0) to 7 for easier calculation
    const dayIndex = effectiveDay === 0 ? 7 : effectiveDay;
    const dayBucketIndex = dayIndex - 1; // Monday = 0, Tuesday = 1, etc.
    
    // Reorder day buckets so current day is first
    // Hide buckets for days that have passed (only show remaining days in current week)
    const dayBuckets = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    let orderedDayBuckets;
    
    if (effectiveDay === 6 || effectiveDay === 0) {
        // It's Saturday or Sunday (or Friday after 7pm) - show all 5 buckets for next week
        orderedDayBuckets = dayBuckets;
    } else if (dayBucketIndex >= 0 && dayBucketIndex < 5) {
        // Current day is a weekday - only show remaining days (today and future days this week)
        // Hide buckets for days that have passed
        orderedDayBuckets = dayBuckets.slice(dayBucketIndex);
    } else {
        // Fallback - show all buckets
        orderedDayBuckets = dayBuckets;
    }
    
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    let tasksToRender = [];
    try {
        if (typeof getAllTasks === 'function') {
            tasksToRender = searchTerm ? filterTasksBySearch(searchTerm) : getAllTasks();
        } else {
            console.error('getAllTasks function not available');
            tasksToRender = [];
        }
    } catch (error) {
        console.error('Error getting tasks:', error);
        tasksToRender = [];
    }
    
    // Reorder the DOM elements to match the new order
    // Only reorder if the container exists and we're not in the middle of a search
    try {
        const dayBucketsContainer = document.querySelector('.day-buckets-container');
        if (dayBucketsContainer && !searchTerm) {
            // Store current order to avoid unnecessary reordering
            const currentOrder = Array.from(dayBucketsContainer.children)
                .map(el => el.getAttribute('data-bucket'))
                .filter(b => b); // Filter out null values
            
            // Only reorder if the order is actually different
            const needsReorder = currentOrder.length === orderedDayBuckets.length &&
                !currentOrder.every((bucket, index) => bucket === orderedDayBuckets[index]);
            
            if (needsReorder) {
                orderedDayBuckets.forEach(dayName => {
                    const bucketElement = document.querySelector(`[data-bucket="${dayName}"]`);
                    if (bucketElement && bucketElement.parentNode === dayBucketsContainer) {
                        dayBucketsContainer.appendChild(bucketElement);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error reordering day buckets:', error);
        // Continue with rendering even if reordering fails
    }
    
    // Hide buckets for days that have passed (during the work week)
    // Show all buckets on Saturday/Sunday
    // Also update grid columns to fill horizontal space
    const dayBucketsContainer = document.querySelector('.day-buckets-container');
    let visibleBucketCount = 0;
    
    if (effectiveDay !== 0 && effectiveDay !== 6) {
        // It's a weekday - hide buckets for days that have passed (using 7pm cutoff)
        dayBuckets.forEach(dayName => {
            const dayIndex = dayBuckets.indexOf(dayName);
            const dayBucketIndexForDay = dayIndex; // Monday=0, Tuesday=1, etc.
            
            if (dayBucketIndexForDay < dayBucketIndex) {
                // This day has passed (after 7pm cutoff) - hide the bucket
                const dayBucketContainer = document.querySelector(`[data-bucket="${dayName}"]`);
                if (dayBucketContainer) {
                    dayBucketContainer.style.display = 'none';
                }
            } else {
                // This day is today or in the future - show the bucket
                const dayBucketContainer = document.querySelector(`[data-bucket="${dayName}"]`);
                if (dayBucketContainer) {
                    dayBucketContainer.style.display = 'flex';
                    visibleBucketCount++;
                }
            }
        });
    } else {
        // It's Saturday or Sunday (or Friday after 7pm) - show all buckets
        visibleBucketCount = 5;
        dayBuckets.forEach(dayName => {
            const dayBucketContainer = document.querySelector(`[data-bucket="${dayName}"]`);
            if (dayBucketContainer) {
                dayBucketContainer.style.display = 'flex';
            }
        });
    }
    
    // Update grid columns to match visible bucket count so they fill the horizontal space
    // But respect responsive breakpoints for very small screens
    if (dayBucketsContainer && visibleBucketCount > 0) {
        const screenWidth = window.innerWidth;
        if (screenWidth <= 768) {
            // On mobile, always use 1 column
            dayBucketsContainer.style.gridTemplateColumns = '1fr';
        } else if (screenWidth <= 1200 && visibleBucketCount > 3) {
            // On medium screens, limit to 3 columns max
            dayBucketsContainer.style.gridTemplateColumns = `repeat(${Math.min(visibleBucketCount, 3)}, 1fr)`;
        } else {
            // On larger screens, use all visible buckets
            dayBucketsContainer.style.gridTemplateColumns = `repeat(${visibleBucketCount}, 1fr)`;
        }
    }
    
    // Render in the new order
    orderedDayBuckets.forEach(dayName => {
        const bucketElement = document.getElementById(`bucket-${dayName}`);
        const titleElement = document.getElementById(`${dayName}-title`);
        if (!bucketElement || !titleElement) return;
        
        // Get date for this day (using task-manager function)
        try {
            let dayDate = null;
            // getDateForDay should be available from task-manager.js
            if (typeof getDateForDay === 'function') {
                dayDate = getDateForDay(dayName);
            } else {
                console.warn('getDateForDay function not found for', dayName);
            }
            if (dayDate) {
                // Parse YYYY-MM-DD format
                const dateParts = dayDate.split('-');
                if (dateParts.length === 3) {
                    const year = parseInt(dateParts[0]);
                    const month = parseInt(dateParts[1]) - 1;
                    const day = parseInt(dateParts[2]);
                    const date = new Date(year, month, day);
                    if (!isNaN(date.getTime())) {
                        // Format as "Tuesday, November 18" (day name already included, so just month and day)
                        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                        const dayNum = date.getDate();
                        titleElement.textContent = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${monthName} ${dayNum}`;
                    } else {
                        titleElement.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                    }
                } else {
                    titleElement.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                }
            } else {
                titleElement.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
            }
        } catch (error) {
            console.error('Error rendering date for', dayName, error);
            titleElement.textContent = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        }
        
        // Get tasks for this day bucket
        let bucketTasks = tasksToRender.filter(task => {
            if (task.bucket !== dayName) return false;
            if (task.completed) return false;
            if (task.flagged) return false;
            return true;
        });
        
        // Sort tasks - tasks with due dates come first
        bucketTasks.sort((a, b) => {
            // Primary sort: tasks with due dates come first
            const aHasDueDate = !!a.dueDate;
            const bHasDueDate = !!b.dueDate;
            
            if (aHasDueDate && !bHasDueDate) return -1; // a comes first
            if (!aHasDueDate && bHasDueDate) return 1;  // b comes first
            
            // Both have due dates or both don't - sort by due date if both have it
            if (aHasDueDate && bHasDueDate) {
                const dateA = new Date(a.dueDate).getTime();
                const dateB = new Date(b.dueDate).getTime();
                if (dateA !== dateB) {
                    return dateA - dateB; // Earlier dates first
                }
            }
            
            // Secondary sort: by order (for drag and drop)
            const orderA = a.order ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const orderB = b.order ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return orderA - orderB;
        });
        
        // Update count
        const countElement = document.getElementById(`count-${dayName}`);
        if (countElement) {
            const totalCount = getAllTasks().filter(t => 
                t.bucket === dayName && !t.flagged && !t.completed
            ).length;
            countElement.textContent = totalCount;
        }
        
        // Get the day bucket container
        const dayBucketContainer = document.querySelector(`[data-bucket="${dayName}"]`);
        
        // When searching, hide day buckets without matches
        if (searchTerm) {
            if (bucketTasks.length === 0) {
                // Hide the entire day bucket if no matches
                if (dayBucketContainer) {
                    dayBucketContainer.style.display = 'none';
                }
                bucketElement.innerHTML = '';
            } else {
                // Show the day bucket if it has matches
                if (dayBucketContainer) {
                    dayBucketContainer.style.display = 'flex';
                }
                bucketElement.innerHTML = bucketTasks.map(task => createTaskCard(task)).join('');
                
                // Attach event listeners and restore selection
                bucketTasks.forEach(task => {
                    attachTaskEventListeners(task.id);
                    if (selectedTasks.has(task.id)) {
                        const card = bucketElement.querySelector(`[data-task-id="${task.id}"]`);
                        if (card) {
                            card.classList.add('task-selected');
                        }
                    }
                });
                
                // Optimize card sizing
                optimizeBucketCardSizing(bucketElement, bucketTasks.length);
            }
        } else {
            // Not searching - show all day buckets
            if (dayBucketContainer) {
                dayBucketContainer.style.display = 'flex';
            }
            
            // Render tasks
            if (bucketTasks.length === 0) {
                bucketElement.innerHTML = '';
            } else {
                bucketElement.innerHTML = bucketTasks.map(task => createTaskCard(task)).join('');
                
                // Attach event listeners and restore selection
                bucketTasks.forEach(task => {
                    attachTaskEventListeners(task.id);
                    if (selectedTasks.has(task.id)) {
                        const card = bucketElement.querySelector(`[data-task-id="${task.id}"]`);
                        if (card) {
                            card.classList.add('task-selected');
                        }
                    }
                });
                
                // Optimize card sizing
                optimizeBucketCardSizing(bucketElement, bucketTasks.length);
            }
        }
        
        // Make bucket header clickable to add task
        const bucketHeader = document.getElementById(`${dayName}-header`);
        if (bucketHeader && !bucketHeader.dataset.addTaskListener) {
            bucketHeader.dataset.addTaskListener = 'true';
            bucketHeader.style.cursor = 'pointer';
            bucketHeader.addEventListener('click', (e) => {
                if (e.target.closest('.bucket-toggle') || e.target.closest('.bucket-count')) return;
                if (hasDragged) return;
                e.stopPropagation();
                const bucketSelect = document.getElementById('taskBucket');
                if (bucketSelect) {
                    bucketSelect.value = dayName;
                }
                openTaskModal();
            });
        }
    });
}

// Render all buckets
function renderBuckets() {
    const buckets = ['this-week', 'next-week', 'this-month', 'next-month', 'recurring', 'someday'];
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // Get filtered tasks if searching
    const tasksToRender = searchTerm ? filterTasksBySearch(searchTerm) : getAllTasks();
    
    // Hide/show completed button based on search
    const completedBtn = document.getElementById('completedBtn');
    const completedButtonContainer = document.querySelector('.completed-button-container');
    if (completedBtn && completedButtonContainer) {
        if (searchTerm) {
            completedButtonContainer.style.display = 'none';
        } else {
            completedButtonContainer.style.display = 'flex';
        }
    }
    
    // Render flagged tasks section (exclude completed tasks from flagged section)
    renderFlaggedTasks(tasksToRender.filter(task => !task.completed));
    
    // Render day buckets
    renderDayBuckets();
    
    buckets.forEach(bucket => {
        const bucketElement = document.getElementById(`bucket-${bucket}`);
        if (!bucketElement) return;
        
        // Get the parent bucket container (the one with data-bucket attribute)
        const bucketContainer = document.querySelector(`[data-bucket="${bucket}"]`);
        
        // Get tasks for this bucket
        // Exclude flagged tasks from regular buckets (they're shown separately)
        // Exclude completed tasks from regular buckets (they're shown in completed bucket)
        let bucketTasks = tasksToRender.filter(task => {
            if (task.bucket !== bucket) return false;
            if (bucket !== 'completed' && task.completed) return false; // Don't show completed tasks in regular buckets
            if (bucket !== 'completed' && task.flagged) return false; // Don't show flagged tasks in regular buckets
            return true;
        });
        
        // Define which buckets should be collapsed by default (bottom row)
        const bottomRowBuckets = ['next-month', 'recurring', 'someday'];
        const isBottomRow = bottomRowBuckets.includes(bucket);
        
        // Handle search mode: hide buckets without matches, show and expand buckets with matches
        if (searchTerm) {
            if (bucketTasks.length > 0 && bucketContainer) {
                // Show and expand bucket with matches
                bucketElement.style.display = 'flex';
                bucketContainer.style.display = 'flex';
                bucketContainer.classList.remove('bucket-collapsed');
                // Update toggle button if it exists
                const toggle = document.getElementById(`${bucket}-toggle`);
                if (toggle) {
                    toggle.textContent = '▲';
                }
            } else if (bucketContainer) {
                // Hide bucket without matches
                bucketContainer.style.display = 'none';
            }
        } else {
            // Normal mode: restore default visibility
            if (bucketContainer) {
                bucketContainer.style.display = 'flex';
            }
            if (isBottomRow && bucketContainer) {
                // Collapse bottom row buckets when search is cleared
                bucketElement.style.display = 'none';
                bucketContainer.classList.add('bucket-collapsed');
                // Update toggle button if it exists
                const toggle = document.getElementById(`${bucket}-toggle`);
                if (toggle) {
                    toggle.textContent = '▼';
                }
            } else if (bucketContainer) {
                // Expand top row buckets
                bucketElement.style.display = 'flex';
                bucketContainer.classList.remove('bucket-collapsed');
            }
        }
        
        // Sort by order (for drag and drop), then by due date
        // For completed bucket, sort by completedAt (most recent first)
        if (bucket === 'completed') {
            bucketTasks.sort((a, b) => {
                const completedA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                const completedB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                return completedB - completedA; // Most recent first
            });
        } else {
            bucketTasks.sort((a, b) => {
                // Primary sort: tasks with due dates come first
                const aHasDueDate = !!a.dueDate;
                const bHasDueDate = !!b.dueDate;
                
                if (aHasDueDate && !bHasDueDate) return -1; // a comes first
                if (!aHasDueDate && bHasDueDate) return 1;  // b comes first
                
                // Both have due dates or both don't - sort by due date if both have it
                if (aHasDueDate && bHasDueDate) {
                    const dateA = new Date(a.dueDate).getTime();
                    const dateB = new Date(b.dueDate).getTime();
                    if (dateA !== dateB) {
                        return dateA - dateB; // Earlier dates first
                    }
                }
                
                // Secondary sort: by order (for drag and drop)
                const orderA = a.order ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const orderB = b.order ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return orderA - orderB;
            });
        }
        
        // Update count and get total count for collapse logic
        const countElement = document.getElementById(`count-${bucket}`);
        let totalCount = 0;
        if (countElement) {
            if (bucket === 'completed') {
                totalCount = getAllTasks().filter(t => t.completed === true).length;
            } else {
                // Count only tasks in this bucket that are not flagged and not completed
                totalCount = getAllTasks().filter(t => 
                    t.bucket === bucket && 
                    !t.flagged && 
                    !t.completed
                ).length;
            }
            countElement.textContent = totalCount;
        }
        
        // Render tasks
        if (bucketTasks.length === 0) {
            bucketElement.innerHTML = '';
            
            // Auto-collapse empty buckets (but not during search, and not for completed bucket)
            // Use totalCount to check if bucket is truly empty (not just filtered out)
            if (!searchTerm && bucket !== 'completed' && bucketContainer && totalCount === 0) {
                bucketElement.style.display = 'none';
                bucketContainer.classList.add('bucket-collapsed');
                // Update toggle button if it exists
                const toggle = document.getElementById(`${bucket}-toggle`);
                if (toggle) {
                    toggle.textContent = '▼';
                }
            }
        } else {
            bucketElement.innerHTML = bucketTasks.map(task => createTaskCard(task)).join('');
            
            // Restore selection state after rendering
            bucketTasks.forEach(task => {
                if (selectedTasks.has(task.id)) {
                    const card = bucketElement.querySelector(`[data-task-id="${task.id}"]`);
                    if (card) {
                        card.classList.add('task-selected');
                    }
                }
            });
            
            // Expand bucket if it has tasks
            if (bucketContainer && !searchTerm) {
                bucketElement.style.display = 'flex';
                bucketContainer.classList.remove('bucket-collapsed');
                // Update toggle button if it exists
                const toggle = document.getElementById(`${bucket}-toggle`);
                if (toggle) {
                    toggle.textContent = '▲';
                }
            }
            
            // Attach event listeners
            bucketTasks.forEach(task => {
                attachTaskEventListeners(task.id);
            });
            
            // Optimize card sizing to fit all tasks without scrolling
            optimizeBucketCardSizing(bucketElement, bucketTasks.length);
        }
        
        // Make bucket header clickable to add task (but not the toggle button or count)
        const bucketHeader = document.getElementById(`${bucket}-header`);
        if (bucketHeader) {
            bucketHeader.style.cursor = 'pointer';
            // Only add listener once to avoid duplicates
            if (!bucketHeader.dataset.addTaskListener) {
                bucketHeader.dataset.addTaskListener = 'true';
                bucketHeader.addEventListener('click', (e) => {
                    // Don't trigger if clicking on the toggle button or count
                    if (e.target.closest('.bucket-toggle') || e.target.closest('.bucket-count')) return;
                    if (hasDragged) return;
                    e.stopPropagation();
                    // Pre-select this bucket before opening modal
                    const bucketSelect = document.getElementById('taskBucket');
                    if (bucketSelect) {
                        bucketSelect.value = bucket;
                    }
                    // If recurring bucket, check the recurring checkbox
                    if (bucket === 'recurring') {
                        const recurringCheckbox = document.getElementById('taskRecurring');
                        if (recurringCheckbox) {
                            recurringCheckbox.checked = true;
                            // Mark to preserve recurring checkbox in openTaskModal
                            recurringCheckbox.setAttribute('data-preserve-recurring', 'true');
                            // Trigger change event to show recurring options
                            recurringCheckbox.dispatchEvent(new Event('change'));
                        }
                    }
                    openTaskModal();
                });
            }
        }
    });
    
    // Make flagged header clickable to add flagged task
    const flaggedHeader = document.querySelector('.flagged-header');
    if (flaggedHeader) {
        flaggedHeader.style.cursor = 'pointer';
        // Only add listener once to avoid duplicates
        if (!flaggedHeader.dataset.addTaskListener) {
            flaggedHeader.dataset.addTaskListener = 'true';
            flaggedHeader.addEventListener('click', (e) => {
                // Don't trigger if clicking on the count
                if (e.target.closest('.flagged-count')) return;
                if (hasDragged) return;
                e.stopPropagation();
                // Pre-select flag checkbox and set bucket to this-week
                const flagCheckbox = document.getElementById('taskFlagged');
                if (flagCheckbox) {
                    flagCheckbox.checked = true;
                    // Mark to preserve flag checkbox in openTaskModal
                    flagCheckbox.setAttribute('data-preserve-flag', 'true');
                }
                const bucketSelect = document.getElementById('taskBucket');
                if (bucketSelect) {
                    bucketSelect.value = 'this-week';
                }
                openTaskModal();
            });
        }
    }
    
    // If searching, scroll to first matching task
    if (searchTerm) {
        setTimeout(() => {
            // Find first visible task card (check flagged section first, then buckets)
            const flaggedSection = document.getElementById('flaggedSection');
            let firstTaskCard = null;
            
            if (flaggedSection && flaggedSection.style.display !== 'none') {
                firstTaskCard = flaggedSection.querySelector('.task-card');
            }
            
            if (!firstTaskCard) {
                // Find first visible task card in buckets
                firstTaskCard = document.querySelector('[data-bucket] .task-card');
            }
            
            if (firstTaskCard) {
                firstTaskCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }
    
    // Optimize card sizing for all buckets after a short delay to ensure layout is complete
    setTimeout(() => {
        optimizeAllBucketsCardSizing();
        // Also optimize day buckets
        const dayBuckets = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        dayBuckets.forEach(dayName => {
            const dayBucketElement = document.getElementById(`bucket-${dayName}`);
            if (dayBucketElement) {
                const taskCards = dayBucketElement.querySelectorAll('.task-card');
                if (taskCards.length > 0) {
                    optimizeBucketCardSizing(dayBucketElement, taskCards.length);
                }
            }
        });
        // Also optimize flagged tasks
        const flaggedTasksContainer = document.getElementById('flaggedTasks');
        if (flaggedTasksContainer) {
            const taskCards = flaggedTasksContainer.querySelectorAll('.task-card');
            if (taskCards.length > 0) {
                optimizeBucketCardSizing(flaggedTasksContainer, taskCards.length);
            }
        }
    }, 50);
}

// Optimize card sizing for a single bucket or flagged tasks section
function optimizeBucketCardSizing(bucketTasksElement, taskCount) {
    if (!bucketTasksElement || taskCount === 0) return;
    
    // Get the container (bucket or flagged-section)
    const container = bucketTasksElement.closest('.bucket') || bucketTasksElement.closest('.flagged-section');
    if (!container) return;
    
    // Get available width (container width minus padding)
    const containerRect = container.getBoundingClientRect();
    if (containerRect.width === 0) return; // Not visible yet
    
    const padding = 32; // 1rem on each side = 16px * 2
    const gap = 12; // 0.75rem gap between cards
    const availableWidth = containerRect.width - padding;
    
    // Preferred and minimum card widths
    const preferredCardWidth = 240; // Preferred size for cards
    const minCardWidth = 180; // Minimum size to maintain readability
    
    // Calculate how many cards fit per row at preferred width
    let cardsPerRowAtPreferred = Math.floor((availableWidth + gap) / (preferredCardWidth + gap));
    cardsPerRowAtPreferred = Math.max(1, cardsPerRowAtPreferred); // At least 1
    
    let optimalColumns;
    let cardWidth;
    
    // If we can't fit even one card at preferred width, use minimum width
    if (availableWidth < preferredCardWidth) {
        const cardsPerRowAtMin = Math.floor((availableWidth + gap) / (minCardWidth + gap));
        optimalColumns = Math.max(1, cardsPerRowAtMin);
        cardWidth = Math.max(
            minCardWidth,
            (availableWidth - (optimalColumns - 1) * gap) / optimalColumns
        );
    } else {
        // CRITICAL: Always use the number of columns that fit per row, NOT the task count
        // This ensures cards wrap to multiple rows when there are more cards than columns
        optimalColumns = cardsPerRowAtPreferred;
        
        // Calculate card width to fill ALL available space (no wasted space)
        // Distribute remaining space evenly among cards
        const totalGapSpace = (optimalColumns - 1) * gap;
        const totalCardSpace = availableWidth - totalGapSpace;
        cardWidth = totalCardSpace / optimalColumns;
        
        // Only enforce minimum width - allow cards to grow wider to fill space
        cardWidth = Math.max(minCardWidth, cardWidth);
        
        // Only if ALL cards fit in one row AND we want to fill space, use taskCount
        // But limit this to avoid preventing wrapping
        if (cardsPerRowAtPreferred > taskCount && taskCount > 0) {
            // More columns available than tasks - can use taskCount to fill space
            const calculatedWidth = (availableWidth - (taskCount - 1) * gap) / taskCount;
            if (calculatedWidth >= minCardWidth) {
                cardWidth = calculatedWidth;
                optimalColumns = taskCount;
            }
        }
    }
    
    // Apply the grid template columns
    // Use a fixed repeat to create exactly the number of columns that fit per row
    // CSS Grid will automatically wrap cards to new rows when there are more cards than columns
    // IMPORTANT: We use the calculated number of columns, NOT the task count
    bucketTasksElement.style.gridTemplateColumns = `repeat(${optimalColumns}, ${cardWidth}px)`;
    
    // Ensure grid allows wrapping (should be default, but make it explicit)
    bucketTasksElement.style.gridAutoFlow = 'row';
    // Use auto instead of min-content to prevent all cards in a row from expanding
    bucketTasksElement.style.gridAutoRows = 'auto';
    
    // Force grid to respect the column count (override any CSS that might interfere)
    bucketTasksElement.style.display = 'grid';
}

// Optimize card sizing for all visible buckets
function optimizeAllBucketsCardSizing() {
    const buckets = ['this-week', 'next-week', 'this-month', 'next-month', 'recurring', 'someday'];
    
    buckets.forEach(bucket => {
        const bucketElement = document.getElementById(`bucket-${bucket}`);
        if (!bucketElement) return;
        
        // Only optimize if bucket is visible
        const bucketContainer = document.querySelector(`[data-bucket="${bucket}"]`);
        if (!bucketContainer) return;
        
        const isVisible = bucketElement.style.display !== 'none' && 
                         bucketContainer.style.display !== 'none';
        if (!isVisible) return;
        
        const taskCards = bucketElement.querySelectorAll('.task-card');
        if (taskCards.length > 0) {
            optimizeBucketCardSizing(bucketElement, taskCards.length);
        }
    });
}


// Render flagged tasks in horizontal section
function renderFlaggedTasks(tasksToRender) {
    const flaggedSection = document.getElementById('flaggedSection');
    const flaggedTasksContainer = document.getElementById('flaggedTasks');
    const flaggedCountElement = document.getElementById('flaggedCount');
    
    if (!flaggedSection || !flaggedTasksContainer || !flaggedCountElement) return;
    
    // Get flagged tasks (filter by search if applicable)
    const flaggedTasks = tasksToRender.filter(task => task.flagged === true);
    
    // Sort flagged tasks by order, then by due date
    flaggedTasks.sort((a, b) => {
        const orderA = a.order ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const orderB = b.order ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
    });
    
    // Update count (use all tasks, not filtered, exclude completed)
    const totalFlaggedCount = getAllTasks().filter(t => t.flagged === true && !t.completed).length;
    flaggedCountElement.textContent = totalFlaggedCount;
    
    // Check if we're in search mode
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // Hide flagged section if there are no flagged tasks at all (not just filtered)
    // Only show if there are actual flagged tasks (excluding completed)
    if (totalFlaggedCount === 0) {
        flaggedSection.style.display = 'none';
    } else if (flaggedTasks.length === 0 && searchTerm) {
        // If searching and no matches, hide it
        flaggedSection.style.display = 'none';
    } else {
        // Show the section and render tasks
        flaggedSection.style.display = 'block';
        flaggedTasksContainer.innerHTML = flaggedTasks.map(task => createTaskCard(task)).join('');
        
        // Attach event listeners to flagged tasks
        flaggedTasks.forEach(task => {
            attachTaskEventListeners(task.id);
        });
        
        // Optimize card sizing using the same logic as buckets
        optimizeBucketCardSizing(flaggedTasksContainer, flaggedTasks.length);
    }
}

// Create task card HTML
function createTaskCard(task) {
    // Parse due date string (YYYY-MM-DD) as local date to avoid timezone issues
    let dueDate = null;
    if (task.dueDate) {
        const dateParts = task.dueDate.split('-');
        if (dateParts.length === 3) {
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
            const day = parseInt(dateParts[2]);
            dueDate = new Date(year, month, day, 0, 0, 0, 0);
        }
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let dueDateClass = '';
    let dueDateText = '';
    if (dueDate && !isNaN(dueDate.getTime())) {
        const daysDiff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        if (daysDiff < 0) {
            dueDateClass = 'overdue';
        } else if (daysDiff <= 3) {
            dueDateClass = 'due-soon';
        }
        dueDateText = formatDate(dueDate);
    }

    const flagClass = task.flagged ? 'flagged' : '';
    const completedClass = task.completed ? 'completed' : '';
    
    return `
        <div class="task-card ${flagClass} ${completedClass}" 
             data-task-id="${task.id}" 
             draggable="true"
             ondragstart="handleDragStart(event, '${task.id}')"
             ondragend="handleDragEnd(event)">
            <div class="task-header">
                <div class="task-title">${escapeHtml(task.title).replace(/\n/g, '<br>')}</div>
                <div class="task-actions">
                    <button class="flag-task ${task.flagged ? 'flagged' : ''}" data-id="${task.id}" title="${task.flagged ? 'Unflag' : 'Flag'}">🚩</button>
                    <button class="complete-task ${task.completed ? 'completed' : ''}" data-id="${task.id}" title="${task.completed ? 'Mark as incomplete' : 'Mark as complete'}"></button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                ${dueDate ? `<span class="due-date ${dueDateClass}" data-task-id="${task.id}" title="Click to edit task">📅 ${dueDateText}</span>` : ''}
            </div>
            ${task.tags.length > 0 ? `
                <div class="task-tags">
                    ${task.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// Attach event listeners to task card
function attachTaskEventListeners(taskId) {
    // Find the task card - prefer visible ones, but get any if needed
    const allCards = document.querySelectorAll(`[data-task-id="${taskId}"]`);
    let card = null;
    
    // First try to find a visible card
    for (const c of allCards) {
        const style = window.getComputedStyle(c);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
            card = c;
            break;
        }
    }
    
    // If no visible card found, use the first one (shouldn't happen, but fallback)
    if (!card && allCards.length > 0) {
        card = allCards[0];
    }
    
    if (!card) {
        console.warn(`Task card not found for task ${taskId}`);
        return;
    }

    // Flag button clicks are now handled by event delegation in initializeUI()
    // No need to attach individual listeners here

    const completeButton = card.querySelector('.complete-task');
    if (completeButton) {
        completeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
                toggleTaskCompletion(taskId);
                saveAndRender();
            } catch (error) {
                console.error('Error toggling task completion:', error);
                alert('Failed to toggle completion. Please try again.');
            }
        });
    }
    
    // Make due date clickable to edit just the due date
    const dueDateElement = card.querySelector('.due-date');
    if (dueDateElement) {
        dueDateElement.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            editTaskDueDate(taskId, dueDateElement);
        });
    }
    
    // Make entire task card clickable to edit (but not if we just dragged)
    // Only attach if not already attached (check for a marker)
    if (!card.dataset.cardClickAttached) {
        card.dataset.cardClickAttached = 'true';
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on action buttons, due date, or if we just dragged
            if (hasDragged || isDragging) return;
            if (e.target.closest('.task-actions')) return;
            if (e.target.closest('.due-date')) return;
            if (e.target.closest('.task-tags')) return;
            
            // Don't trigger if this was part of a drag operation
            if (document.querySelector('.task-card.dragging')) return;
            
            // Check for Ctrl/Cmd key for multi-select
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                toggleTaskSelection(taskId);
                return;
            }
            
            // If tasks are selected and clicking without Ctrl, clear selection first
            if (selectedTasks.size > 0) {
                clearTaskSelection();
            }
            
            // Open edit modal
            openTaskModal(taskId);
        });
    }
}

// Task selection functions
function toggleTaskSelection(taskId) {
    if (selectedTasks.has(taskId)) {
        selectedTasks.delete(taskId);
    } else {
        selectedTasks.add(taskId);
    }
    updateTaskSelectionVisuals();
    
    // If we have selected tasks, show bulk edit button or open modal
    if (selectedTasks.size > 0) {
        // Show bulk edit option (we'll open modal when user clicks edit or right-clicks)
        // For now, we'll open bulk edit modal when selection changes and there are multiple tasks
        if (selectedTasks.size > 1) {
            // Don't auto-open, let user trigger it
        }
    }
}

function clearTaskSelection() {
    selectedTasks.clear();
    updateTaskSelectionVisuals();
}

function updateTaskSelectionVisuals() {
    // Update all task cards to show selection state
    document.querySelectorAll('.task-card').forEach(card => {
        const taskId = card.getAttribute('data-task-id');
        if (taskId && selectedTasks.has(taskId)) {
            card.classList.add('task-selected');
        } else {
            card.classList.remove('task-selected');
        }
    });
    
    // Show/hide bulk edit button or indicator
    updateBulkEditIndicator();
}

function updateBulkEditIndicator() {
    // Remove existing indicator if any
    let indicator = document.getElementById('bulkEditIndicator');
    if (selectedTasks.size === 0) {
        if (indicator) {
            indicator.remove();
        }
        return;
    }
    
    // Create or update indicator
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'bulkEditIndicator';
        indicator.className = 'bulk-edit-indicator';
        document.body.appendChild(indicator);
    }
    
    indicator.innerHTML = `
        <div class="bulk-edit-content">
            <span class="bulk-edit-count">${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} selected</span>
            <button class="btn btn-primary" id="bulkEditBtn">Edit Selected</button>
            <button class="btn btn-secondary" id="clearSelectionBtn">Clear</button>
        </div>
    `;
    
    // Attach event listeners
    const bulkEditBtn = document.getElementById('bulkEditBtn');
    const clearBtn = document.getElementById('clearSelectionBtn');
    
    if (bulkEditBtn) {
        bulkEditBtn.addEventListener('click', () => {
            openBulkEditModal();
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearTaskSelection();
        });
    }
}

// Drag and Drop handlers
let hasDragged = false; // Track if we just performed a drag operation
let draggedTaskIds = []; // Track all tasks being dragged (for multi-select)
let originalTaskPositions = []; // Store original positions to restore if drag is canceled
let dropOccurred = false; // Track if a drop actually occurred
let isDragging = false; // Track if we're currently in a drag operation
let autoScrollInterval = null; // Track auto-scroll interval

function handleDragStart(event, taskId) {
    // Prevent default to ensure drag works properly
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', taskId);
    
    draggedTaskId = taskId;
    draggedElement = event.currentTarget;
    hasDragged = false; // Reset flag at start of drag
    dropOccurred = false; // Reset drop flag
    isDragging = true; // Mark that we're dragging
    
    // Check if this task is selected - if so, drag all selected tasks
    if (selectedTasks.has(taskId) && selectedTasks.size > 1) {
        draggedTaskIds = Array.from(selectedTasks);
        // Add dragging class to all selected tasks
        draggedTaskIds.forEach(id => {
            const card = document.querySelector(`[data-task-id="${id}"]`);
            if (card) {
                card.classList.add('dragging', 'dragging-multi');
            }
        });
        
        // Try to create a custom drag image showing multiple cards
        // Must be done synchronously during dragstart
        try {
            const dragImage = createMultiTaskDragImage(draggedTaskIds.length);
            if (dragImage) {
                event.dataTransfer.setDragImage(dragImage, 20, 20);
            }
        } catch (error) {
            // If drag image creation fails, continue without it
            console.warn('Could not create custom drag image, using default:', error);
        }
    } else {
        // Single task drag
        draggedTaskIds = [taskId];
        event.currentTarget.classList.add('dragging');
    }
    
    // Start auto-scroll detection after a small delay to ensure drag is established
    setTimeout(() => {
        if (isDragging) {
            startAutoScroll();
        }
    }, 100);
    
    // Store original positions for all dragged tasks
    originalTaskPositions = draggedTaskIds.map(id => {
        const task = getTaskById(id);
        if (!task) return null;
        
        // Get all tasks in the same bucket to determine position
        const bucketTasks = getAllTasks().filter(t => 
            t.bucket === task.bucket && 
            !t.completed && 
            !t.flagged
        );
        
        // Sort by order to get current position
        bucketTasks.sort((a, b) => {
            const orderA = a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const orderB = b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return orderA - orderB;
        });
        
        const position = bucketTasks.findIndex(t => t.id === id);
        
        return {
            id: id,
            bucket: task.bucket,
            order: task.order || (task.createdAt ? new Date(task.createdAt).getTime() : 0),
            position: position >= 0 ? position : bucketTasks.length
        };
    }).filter(pos => pos !== null);
    
    // Store initial drag position
    const rect = draggedElement.getBoundingClientRect();
    dragStartPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

let draggedElement = null;

// Auto-scroll functionality during drag
let currentScrollX = 0;
let currentScrollY = 0;

function startAutoScroll() {
    // Clear any existing interval
    stopAutoScroll();
    
    // Set up auto-scroll on dragover
    const handleAutoScroll = (e) => {
        if (!isDragging) {
            stopAutoScroll();
            return;
        }
        
        const scrollThreshold = 80; // Distance from edge to trigger scroll
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Calculate scroll speeds based on distance from edge (faster when closer)
        let scrollX = 0;
        let scrollY = 0;
        
        // Horizontal scrolling
        if (mouseX < scrollThreshold) {
            // Closer to edge = faster scroll
            scrollX = -Math.max(5, (scrollThreshold - mouseX) / 5);
        } else if (mouseX > viewportWidth - scrollThreshold) {
            scrollX = Math.max(5, (mouseX - (viewportWidth - scrollThreshold)) / 5);
        }
        
        // Vertical scrolling
        if (mouseY < scrollThreshold) {
            scrollY = -Math.max(5, (scrollThreshold - mouseY) / 5);
        } else if (mouseY > viewportHeight - scrollThreshold) {
            scrollY = Math.max(5, (mouseY - (viewportHeight - scrollThreshold)) / 5);
        }
        
        // Update scroll speeds
        currentScrollX = scrollX;
        currentScrollY = scrollY;
        
        // Start or continue scrolling
        if ((scrollX !== 0 || scrollY !== 0) && !autoScrollInterval) {
            autoScrollInterval = setInterval(() => {
                if (!isDragging) {
                    stopAutoScroll();
                    return;
                }
                
                const currentX = window.scrollX || document.documentElement.scrollLeft;
                const currentY = window.scrollY || document.documentElement.scrollTop;
                
                // Calculate max scroll
                const maxScrollX = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
                const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
                
                let newX = currentX;
                let newY = currentY;
                
                // Scroll horizontally
                if (currentScrollX !== 0) {
                    newX = Math.max(0, Math.min(maxScrollX, currentX + currentScrollX));
                }
                
                // Scroll vertically
                if (currentScrollY !== 0) {
                    newY = Math.max(0, Math.min(maxScrollY, currentY + currentScrollY));
                }
                
                // Apply scroll
                if (newX !== currentX || newY !== currentY) {
                    window.scrollTo({
                        left: newX,
                        top: newY,
                        behavior: 'auto'
                    });
                }
                
                // Stop if we've reached edges and no more scrolling needed
                if ((currentScrollX === 0 || (newX === 0 && currentScrollX < 0) || (newX >= maxScrollX && currentScrollX > 0)) &&
                    (currentScrollY === 0 || (newY === 0 && currentScrollY < 0) || (newY >= maxScrollY && currentScrollY > 0))) {
                    // Check if mouse is still near edge
                    if (currentScrollX === 0 && currentScrollY === 0) {
                        stopAutoScroll();
                    }
                }
            }, 16); // ~60fps
        } else if (scrollX === 0 && scrollY === 0) {
            // Stop scrolling if mouse moved away from edges
            stopAutoScroll();
        }
    };
    
    // Listen for dragover events on document for auto-scroll
    // Use capture phase and don't prevent default to avoid interfering with drag
    document.addEventListener('dragover', handleAutoScroll, { passive: true, capture: false });
    
    // Store handler for cleanup
    document._autoScrollHandler = handleAutoScroll;
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
    
    currentScrollX = 0;
    currentScrollY = 0;
    
    // Remove event listener
    if (document._autoScrollHandler) {
        document.removeEventListener('dragover', document._autoScrollHandler);
        document._autoScrollHandler = null;
    }
}

// Create a custom drag image for multiple tasks
function createMultiTaskDragImage(count) {
    try {
        const dragImage = document.createElement('div');
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.left = '-1000px';
        dragImage.style.width = '200px';
        dragImage.style.height = '150px';
        dragImage.style.background = 'white';
        dragImage.style.border = '3px solid #6366f1';
        dragImage.style.borderRadius = '12px';
        dragImage.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        dragImage.style.padding = '1rem';
        dragImage.style.display = 'flex';
        dragImage.style.flexDirection = 'column';
        dragImage.style.alignItems = 'center';
        dragImage.style.justifyContent = 'center';
        dragImage.style.zIndex = '10000';
        dragImage.style.pointerEvents = 'none';
        dragImage.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        
        // Add count badge
        const countBadge = document.createElement('div');
        countBadge.style.background = '#6366f1';
        countBadge.style.color = 'white';
        countBadge.style.borderRadius = '50%';
        countBadge.style.width = '40px';
        countBadge.style.height = '40px';
        countBadge.style.display = 'flex';
        countBadge.style.alignItems = 'center';
        countBadge.style.justifyContent = 'center';
        countBadge.style.fontWeight = 'bold';
        countBadge.style.fontSize = '1.2rem';
        countBadge.style.marginBottom = '0.5rem';
        countBadge.textContent = count;
        
        // Add text
        const text = document.createElement('div');
        text.style.fontSize = '0.875rem';
        text.style.color = '#1f2937';
        text.style.fontWeight = '600';
        text.textContent = count === 1 ? '1 task' : `${count} tasks`;
        
        dragImage.appendChild(countBadge);
        dragImage.appendChild(text);
        
        document.body.appendChild(dragImage);
        
        // Remove it after a short delay (browser will copy it for the drag image)
        setTimeout(() => {
            if (dragImage.parentNode) {
                dragImage.parentNode.removeChild(dragImage);
            }
        }, 0);
        
        return dragImage;
    } catch (error) {
        console.error('Error creating drag image:', error);
        return null;
    }
}

function handleDragEnd(event) {
    // Remove dragging class from all dragged tasks
    draggedTaskIds.forEach(id => {
        const card = document.querySelector(`[data-task-id="${id}"]`);
        if (card) {
            card.classList.remove('dragging', 'dragging-multi');
        }
    });
    
    // If no drop occurred, restore original positions
    if (!dropOccurred && originalTaskPositions.length > 0) {
        try {
            // Restore original order for each task
            originalTaskPositions.forEach(originalPos => {
                const task = getTaskById(originalPos.id);
                if (task && task.bucket === originalPos.bucket) {
                    // Task is still in the same bucket, restore its order
                    task.order = originalPos.order;
                }
            });
            
            // Reorder all tasks in their original buckets to restore positions
            const bucketsToRestore = [...new Set(originalTaskPositions.map(pos => pos.bucket))];
            bucketsToRestore.forEach(bucket => {
                const tasksInBucket = getAllTasks().filter(t => 
                    t.bucket === bucket && 
                    !t.completed && 
                    !t.flagged
                );
                
                // Sort by original order
                tasksInBucket.sort((a, b) => {
                    const originalA = originalTaskPositions.find(pos => pos.id === a.id);
                    const originalB = originalTaskPositions.find(pos => pos.id === b.id);
                    const orderA = originalA ? originalA.order : (a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0));
                    const orderB = originalB ? originalB.order : (b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0));
                    return orderA - orderB;
                });
                
                // Reassign orders sequentially
                tasksInBucket.forEach((t, index) => {
                    t.order = (index + 1) * 10000;
                });
            });
            
            saveAndRender();
        } catch (error) {
            console.error('Error restoring original positions:', error);
        }
    }
    
    dragStartPosition = null; // Reset drag position
    // Remove drag-over class from all buckets, flagged section, and tasks
    document.querySelectorAll('.bucket-tasks').forEach(el => {
        el.classList.remove('drag-over');
    });
    const flaggedTasksContainer = document.getElementById('flaggedTasks');
    if (flaggedTasksContainer) {
        flaggedTasksContainer.classList.remove('drag-over');
    }
    document.querySelectorAll('.task-card').forEach(el => {
        el.classList.remove('drag-over-task', 'drag-over-before', 'drag-over-after', 'drag-over-left', 'drag-over-right');
    });
    
    // Set flag to indicate we just dragged (prevent click event)
    hasDragged = true;
    
    // Reset flag after a short delay to allow click events again
    setTimeout(() => {
        hasDragged = false;
    }, 100);
    
    draggedTaskId = null;
    draggedTaskIds = [];
    draggedElement = null;
    originalTaskPositions = [];
    dropOccurred = false;
    isDragging = false; // Mark that dragging is complete
    
    // Stop auto-scroll
    stopAutoScroll();
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!draggedTaskId || draggedTaskIds.length === 0) return;
    
    // Mark that a drop occurred
    dropOccurred = true;
    
    // Mark that we've dragged (to prevent click event)
    hasDragged = true;
    
    const task = getTaskById(draggedTaskId);
    if (!task) return;
    
    // Get all tasks being dragged
    let tasksToMove = draggedTaskIds.map(id => getTaskById(id)).filter(t => t !== null && t !== undefined);
    if (tasksToMove.length === 0) return;
    
    // Check if dropping into flagged section
    const flaggedTasksContainer = document.getElementById('flaggedTasks');
    if (event.currentTarget === flaggedTasksContainer || flaggedTasksContainer?.contains(event.currentTarget)) {
        // Dropping into flagged section - flag all tasks
        try {
            tasksToMove.forEach(t => {
                if (!t.flagged) {
                    toggleTaskFlag(t.id);
                }
            });
            clearTaskSelection();
            saveAndRender();
        } catch (error) {
            console.error('Error flagging tasks:', error);
            alert('Failed to flag tasks');
        }
        
        flaggedTasksContainer?.classList.remove('drag-over');
        draggedTaskId = null;
        draggedTaskIds = [];
        draggedElement = null;
        return;
    }
    
    // Get bucket from the drop target
    const bucketTasksElement = event.currentTarget;
    const bucketElement = bucketTasksElement.closest('.bucket');
    if (!bucketElement) return;
    
    const newBucket = bucketElement.getAttribute('data-bucket');
    if (!newBucket) return;
    
    // Remove drag-over classes and indicators
    bucketTasksElement.classList.remove('drag-over');
    document.querySelectorAll('.task-card').forEach(card => {
        card.classList.remove('drag-over-task', 'drag-over-before', 'drag-over-after', 'drag-over-left', 'drag-over-right');
    });
    const indicator = bucketTasksElement.querySelector('.drop-indicator');
    if (indicator) indicator.remove();
    
    // If dropping into completed bucket, mark all as completed
    if (newBucket === 'completed') {
        tasksToMove.forEach(t => {
            if (!t.completed) {
                try {
                    toggleTaskCompletion(t.id);
                } catch (error) {
                    console.error(`Error completing task ${t.id}:`, error);
                }
            }
        });
        // Refresh task references after completing
        tasksToMove = draggedTaskIds.map(id => getTaskById(id)).filter(t => t !== null && t !== undefined);
    }
    
    // If tasks are flagged and being dropped into a bucket, unflag them first
    tasksToMove.forEach(t => {
        if (t.flagged) {
            try {
                toggleTaskFlag(t.id);
            } catch (error) {
                console.error(`Error unflagging task ${t.id}:`, error);
            }
        }
    });
    // Refresh task references after unflagging
    tasksToMove = draggedTaskIds.map(id => getTaskById(id)).filter(t => t !== null && t !== undefined);
    
    // Find the drop position in the target bucket
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    let insertBeforeTaskId = null;
    
    // Get all task cards in the target bucket (excluding all dragged tasks)
    const taskCards = Array.from(bucketTasksElement.querySelectorAll('.task-card'))
        .filter(card => !draggedTaskIds.includes(card.getAttribute('data-task-id')));
    
    // Get all cards with their positions for easier processing
    const cardsWithPositions = taskCards.map(card => {
        const rect = card.getBoundingClientRect();
        return {
            card: card,
            id: card.getAttribute('data-task-id'),
            rect: rect,
            centerX: rect.left + (rect.width / 2),
            centerY: rect.top + (rect.height / 2),
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right
        };
    });
    
    // Check if mouse is directly over a card
    let cardUnderMouse = cardsWithPositions.find(c => 
        mouseX >= c.left && mouseX <= c.right &&
        mouseY >= c.top && mouseY <= c.bottom
    );
    
    if (cardUnderMouse) {
        // Dropping directly on a card - position relative to that card
        if (mouseX < cardUnderMouse.centerX) {
            // Left side - insert before
            insertBeforeTaskId = cardUnderMouse.id;
        } else {
            // Right side - insert after (find next card in DOM order)
            const allCards = Array.from(bucketTasksElement.querySelectorAll('.task-card'))
                .filter(card => !draggedTaskIds.includes(card.getAttribute('data-task-id')));
            const cardIndex = allCards.findIndex(card => card.getAttribute('data-task-id') === cardUnderMouse.id);
            if (cardIndex >= 0 && cardIndex < allCards.length - 1) {
                insertBeforeTaskId = allCards[cardIndex + 1].getAttribute('data-task-id');
            }
        }
    } else {
        // Dropping in empty space - find which row we're in
        // Group cards by row (cards with similar Y positions)
        const rowTolerance = 50; // pixels
        const rows = [];
        
        cardsWithPositions.forEach(card => {
            // Find if this card belongs to an existing row
            let foundRow = false;
            for (let row of rows) {
                // Check if card is in this row (similar Y position)
                if (Math.abs(card.top - row.top) < rowTolerance) {
                    row.cards.push(card);
                    foundRow = true;
                    break;
                }
            }
            if (!foundRow) {
                // Create new row
                rows.push({
                    top: card.top,
                    bottom: card.bottom,
                    cards: [card]
                });
            }
        });
        
        // Sort rows by Y position
        rows.sort((a, b) => a.top - b.top);
        
        // Find which row the mouse is in (or between rows)
        let targetRow = null;
        let insertAfterRow = null;
        let isAboveFirstRow = false;
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (mouseY >= row.top - rowTolerance && mouseY <= row.bottom + rowTolerance) {
                // Mouse is in this row
                targetRow = row;
                break;
            } else if (mouseY < row.top) {
                // Mouse is above this row
                if (i === 0) {
                    // Above the first row - insert before the first card
                    isAboveFirstRow = true;
                    rows[0].cards.sort((a, b) => a.left - b.left);
                    if (rows[0].cards.length > 0) {
                        insertBeforeTaskId = rows[0].cards[0].id;
                    }
                    break;
                } else {
                    // Above a later row - insert before this row
                    targetRow = { top: row.top, bottom: row.top, cards: [] };
                    insertAfterRow = i > 0 ? rows[i - 1] : null;
                    break;
                }
            }
        }
        
        // If mouse is below all rows
        if (!targetRow && !isAboveFirstRow && rows.length > 0) {
            targetRow = { top: rows[rows.length - 1].bottom, bottom: rows[rows.length - 1].bottom, cards: [] };
            insertAfterRow = rows[rows.length - 1];
        }
        
        // If no rows exist (empty bucket)
        if (!targetRow) {
            // insertBeforeTaskId stays null - will add to end
        } else if (targetRow.cards.length > 0) {
            // Row has cards - find position within row
            // Sort cards in row by X position
            targetRow.cards.sort((a, b) => a.left - b.left);
            
            // Find which card position in the row
            for (let i = 0; i < targetRow.cards.length; i++) {
                const card = targetRow.cards[i];
                if (mouseX < card.centerX) {
                    // Insert before this card
                    insertBeforeTaskId = card.id;
                    break;
                } else if (i === targetRow.cards.length - 1) {
                    // After last card in row - find next card in DOM order
                    const allCards = Array.from(bucketTasksElement.querySelectorAll('.task-card'))
                        .filter(card => !draggedTaskIds.includes(card.getAttribute('data-task-id')));
                    const cardIndex = allCards.findIndex(c => c.getAttribute('data-task-id') === card.id);
                    if (cardIndex >= 0 && cardIndex < allCards.length - 1) {
                        insertBeforeTaskId = allCards[cardIndex + 1].getAttribute('data-task-id');
                    }
                }
            }
        } else {
            // Empty row - insert after the last card of the previous row
            if (insertAfterRow && insertAfterRow.cards.length > 0) {
                // Sort cards in previous row by X position
                insertAfterRow.cards.sort((a, b) => a.left - b.left);
                const lastCardInRow = insertAfterRow.cards[insertAfterRow.cards.length - 1];
                
                // Insert after the last card in the previous row
                const allCards = Array.from(bucketTasksElement.querySelectorAll('.task-card'))
                    .filter(card => !draggedTaskIds.includes(card.getAttribute('data-task-id')));
                const cardIndex = allCards.findIndex(c => c.getAttribute('data-task-id') === lastCardInRow.id);
                if (cardIndex >= 0 && cardIndex < allCards.length - 1) {
                    insertBeforeTaskId = allCards[cardIndex + 1].getAttribute('data-task-id');
                }
                // If it's the last card, insertBeforeTaskId stays null (adds to end)
            } else if (rows.length > 0 && rows[0].cards.length > 0) {
                // Inserting before first row - insert before first card
                rows[0].cards.sort((a, b) => a.left - b.left);
                insertBeforeTaskId = rows[0].cards[0].id;
            }
            // Otherwise insertBeforeTaskId stays null (adds to end)
        }
    }
    
    // If no insert position found, insertBeforeTaskId stays null (adds to end)
    
    // Check if we're dropping in the same location (same bucket and same relative position)
    const allInSameBucket = tasksToMove.every(t => t.bucket === newBucket);
    let isSameLocation = false;
    
    if (allInSameBucket && originalTaskPositions.length > 0) {
        // Get all tasks in the target bucket (excluding the ones we're moving)
        const existingTasks = getAllTasks().filter(t => 
            t.bucket === newBucket && 
            !draggedTaskIds.includes(t.id) &&
            !t.completed &&
            !t.flagged
        );
        
        // Sort existing tasks by order
        existingTasks.sort((a, b) => {
            const orderA = a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const orderB = b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return orderA - orderB;
        });
        
        // Calculate where we would insert
        let insertIndex = existingTasks.length;
        if (insertBeforeTaskId) {
            const targetIndex = existingTasks.findIndex(t => t.id === insertBeforeTaskId);
            if (targetIndex >= 0) {
                insertIndex = targetIndex;
            }
        }
        
        // Get original positions sorted
        const originalPositionsSorted = [...originalTaskPositions].sort((a, b) => a.position - b.position);
        const firstOriginalPosition = originalPositionsSorted[0];
        
        // Check if inserting at the same position as the first task's original position
        // We need to account for the fact that when tasks are removed, positions shift
        // So if we're inserting at the position where the first task originally was, it's the same location
        if (firstOriginalPosition && insertIndex === firstOriginalPosition.position) {
            // Also check that the tasks immediately before and after match
            // (if there are tasks before/after)
            const taskBeforeInsert = insertIndex > 0 ? existingTasks[insertIndex - 1] : null;
            const taskAfterInsert = insertIndex < existingTasks.length ? existingTasks[insertIndex] : null;
            
            // Get the original task that was before the first dragged task
            const allOriginalTasks = getAllTasks().filter(t => 
                t.bucket === newBucket && 
                !t.completed && 
                !t.flagged
            );
            allOriginalTasks.sort((a, b) => {
                const orderA = a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const orderB = b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return orderA - orderB;
            });
            
            const originalTaskBefore = firstOriginalPosition.position > 0 
                ? allOriginalTasks[firstOriginalPosition.position - 1] 
                : null;
            const originalTaskAfter = firstOriginalPosition.position + originalPositionsSorted.length < allOriginalTasks.length
                ? allOriginalTasks[firstOriginalPosition.position + originalPositionsSorted.length]
                : null;
            
            // Check if the tasks before and after match
            const beforeMatches = (!taskBeforeInsert && !originalTaskBefore) || 
                                 (taskBeforeInsert && originalTaskBefore && taskBeforeInsert.id === originalTaskBefore.id);
            const afterMatches = (!taskAfterInsert && !originalTaskAfter) || 
                                (taskAfterInsert && originalTaskAfter && taskAfterInsert.id === originalTaskAfter.id);
            
            isSameLocation = beforeMatches && afterMatches;
        }
    }
    
    // If same location, restore original order and skip reordering
    if (isSameLocation) {
        try {
            // Restore original orders
            originalTaskPositions.forEach(originalPos => {
                const task = getTaskById(originalPos.id);
                if (task) {
                    task.order = originalPos.order;
                }
            });
            
            // Reorder all tasks in the bucket to restore original positions
            const allTasksInBucket = getAllTasks().filter(t => 
                t.bucket === newBucket && 
                !t.completed && 
                !t.flagged
            );
            
            // Sort by original order
            allTasksInBucket.sort((a, b) => {
                const originalA = originalTaskPositions.find(pos => pos.id === a.id);
                const originalB = originalTaskPositions.find(pos => pos.id === b.id);
                const orderA = originalA ? originalA.order : (a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0));
                const orderB = originalB ? originalB.order : (b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0));
                return orderA - orderB;
            });
            
            // Reassign orders sequentially
            allTasksInBucket.forEach((t, index) => {
                t.order = (index + 1) * 10000;
            });
            
            // Clear selection after moving
            clearTaskSelection();
            saveAndRender();
        } catch (error) {
            console.error('Error restoring original positions:', error);
            // Fall through to normal reordering
        }
    } else {
        // Move all selected tasks together
        try {
            // Get all tasks that need to be moved to the new bucket
            const tasksToMoveToNewBucket = tasksToMove.filter(t => t.bucket !== newBucket);
            
            // First, move tasks to the new bucket if needed
            tasksToMoveToNewBucket.forEach(t => {
                try {
                    moveTaskToBucket(t.id, newBucket);
                } catch (error) {
                    console.error(`Error moving task ${t.id}:`, error);
                }
            });
            
            // Refresh task references after moving (in case bucket changed)
            tasksToMove = draggedTaskIds.map(id => getTaskById(id)).filter(t => t !== null && t !== undefined);
            
            // Get all tasks in the target bucket (excluding the ones we're moving)
            const existingTasks = getAllTasks().filter(t => 
                t.bucket === newBucket && 
                !draggedTaskIds.includes(t.id) &&
                !t.completed &&
                !t.flagged
            );
            
            // Sort existing tasks by order
            existingTasks.sort((a, b) => {
                const orderA = a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const orderB = b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return orderA - orderB;
            });
            
            // Sort tasks being moved to maintain their relative order
            tasksToMove.sort((a, b) => {
                const orderA = a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const orderB = b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return orderA - orderB;
            });
            
            // Find insert position
            let insertIndex = existingTasks.length;
            if (insertBeforeTaskId) {
                const targetIndex = existingTasks.findIndex(t => t.id === insertBeforeTaskId);
                if (targetIndex >= 0) {
                    insertIndex = targetIndex;
                }
            }
            
            // Build new ordered array with tasks inserted
            const newOrderedTasks = [
                ...existingTasks.slice(0, insertIndex),
                ...tasksToMove,
                ...existingTasks.slice(insertIndex)
            ];
            
            // Reassign orders sequentially
            newOrderedTasks.forEach((t, index) => {
                t.order = (index + 1) * 10000;
                if (tasksToMove.some(mt => mt.id === t.id)) {
                    t.updatedAt = new Date().toISOString();
                }
            });
            
            // Clear selection after moving
            clearTaskSelection();
            saveAndRender();
        } catch (error) {
            console.error('Error moving tasks:', error);
            alert('Failed to move tasks');
        }
    }
    
    draggedTaskId = null;
    draggedTaskIds = [];
    draggedElement = null;
}

// Open task modal
function openTaskModal(taskId = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const deleteBtn = document.getElementById('deleteBtn');
    
    currentEditingTaskId = taskId;
    
    if (taskId) {
        const task = getTaskById(taskId);
        if (!task) return;
        
        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        // Show the date in mm/dd/yy format when editing
        document.getElementById('taskDueDate').value = task.dueDate ? formatDateForEdit(task.dueDate) : '';
        document.getElementById('taskBucket').value = task.bucket || 'this-week';
        document.getElementById('taskTags').value = task.tags.join(', ');
        document.getElementById('taskFlagged').checked = task.flagged || false;
        document.getElementById('taskRecurring').checked = task.recurring?.enabled || false;
        
        if (task.recurring?.enabled) {
            document.getElementById('recurringType').value = task.recurring.type || 'daily';
            document.getElementById('recurringInterval').value = task.recurring.interval || 1;
            document.getElementById('recurringOptions').style.display = 'block';
        } else {
            document.getElementById('recurringOptions').style.display = 'none';
        }
        
        deleteBtn.style.display = 'inline-block';
    } else {
        document.getElementById('modalTitle').textContent = 'Add Task';
        // Preserve bucket value if it was pre-selected (e.g., from clicking in a bucket)
        const bucketSelect = document.getElementById('taskBucket');
        const preservedBucket = bucketSelect ? bucketSelect.value : null;
        
        // Preserve flag and recurring checkbox states before reset
        const flagCheckbox = document.getElementById('taskFlagged');
        const recurringCheckbox = document.getElementById('taskRecurring');
        const preserveFlag = flagCheckbox && (flagCheckbox.checked || flagCheckbox.hasAttribute('data-preserve-flag'));
        const preserveRecurring = recurringCheckbox && (recurringCheckbox.checked || recurringCheckbox.hasAttribute('data-preserve-recurring'));
        
        form.reset();
        document.getElementById('taskId').value = '';
        
        // Restore preserved bucket or default to 'this-week'
        if (bucketSelect) {
            bucketSelect.value = preservedBucket || 'this-week';
        }
        
        // Restore checkboxes based on bucket or preserved state
        // If recurring bucket or preserved, check recurring checkbox
        const shouldBeRecurring = (bucketSelect && bucketSelect.value === 'recurring') || preserveRecurring;
        if (shouldBeRecurring && recurringCheckbox) {
            recurringCheckbox.checked = true;
            document.getElementById('recurringOptions').style.display = 'block';
            // Trigger change event to ensure options are shown
            recurringCheckbox.dispatchEvent(new Event('change'));
            if (recurringCheckbox.hasAttribute('data-preserve-recurring')) {
                recurringCheckbox.removeAttribute('data-preserve-recurring');
            }
        } else {
            if (recurringCheckbox) {
                recurringCheckbox.checked = false;
                document.getElementById('recurringOptions').style.display = 'none';
            }
        }
        
        // Restore flag checkbox if it was preserved
        if (preserveFlag && flagCheckbox) {
            flagCheckbox.checked = true;
            if (flagCheckbox.hasAttribute('data-preserve-flag')) {
                flagCheckbox.removeAttribute('data-preserve-flag');
            }
        } else if (flagCheckbox) {
            flagCheckbox.checked = false;
        }
        
        deleteBtn.style.display = 'none';
    }
    
    modal.classList.add('active');
    
    // Focus on title input after modal is shown
    setTimeout(() => {
        const titleInput = document.getElementById('taskTitle');
        if (titleInput) {
            titleInput.focus();
        }
    }, 100);
}

// Close task modal
function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    modal.classList.remove('active');
    currentEditingTaskId = null;
    document.getElementById('taskForm').reset();
}

// Open bulk edit modal
function openBulkEditModal() {
    if (selectedTasks.size === 0) {
        return;
    }
    
    const modal = document.getElementById('bulkEditModal');
    const form = document.getElementById('bulkEditForm');
    const titleElement = document.getElementById('bulkEditModalTitle');
    
    if (!modal || !form) return;
    
    // Update title with count
    if (titleElement) {
        titleElement.textContent = `Bulk Edit ${selectedTasks.size} Task${selectedTasks.size > 1 ? 's' : ''}`;
    }
    
    // Reset form
    form.reset();
    document.getElementById('bulkEditBucket').value = '';
    document.getElementById('bulkEditDueDate').value = '';
    document.getElementById('bulkEditTags').value = '';
    
    // Show modal
    modal.classList.add('active');
}

// Close bulk edit modal
function closeBulkEditModal() {
    const modal = document.getElementById('bulkEditModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('bulkEditForm').reset();
    }
}

// Handle bulk edit form submission
function handleBulkEditSubmit() {
    if (selectedTasks.size === 0) {
        closeBulkEditModal();
        return;
    }
    
    const bucketValue = document.getElementById('bulkEditBucket').value;
    const dueDateInput = document.getElementById('bulkEditDueDate').value.trim();
    const tagsInput = document.getElementById('bulkEditTags').value.trim();
    
    // Parse due date if provided
    let parsedDate = null;
    if (dueDateInput) {
        parsedDate = parseNaturalDate(dueDateInput);
        if (!parsedDate) {
            alert('Invalid date format. Please try again.');
            return;
        }
    }
    
    // Parse tags if provided
    let newTags = null;
    if (tagsInput) {
        newTags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
    }
    
    // Update all selected tasks
    const taskIds = Array.from(selectedTasks);
    let updatedCount = 0;
    
    taskIds.forEach(taskId => {
        try {
            const task = getTaskById(taskId);
            if (!task) return;
            
            const updateData = {};
            
            // Update bucket if specified
            if (bucketValue) {
                updateData.bucket = bucketValue;
            }
            
            // Update due date if specified
            if (parsedDate) {
                updateData.dueDate = parsedDate;
            }
            
            // Update tags if specified
            if (newTags !== null) {
                // Merge with existing tags, avoiding duplicates
                const existingTags = task.tags || [];
                const mergedTags = [...new Set([...existingTags, ...newTags])];
                updateData.tags = mergedTags;
            }
            
            // Only update if there's something to update
            if (Object.keys(updateData).length > 0) {
                updateTask(taskId, updateData);
                updatedCount++;
            }
        } catch (error) {
            console.error(`Error updating task ${taskId}:`, error);
        }
    });
    
    // Clear selection and close modal
    clearTaskSelection();
    closeBulkEditModal();
    
    // Show success message
    if (updatedCount > 0) {
        saveAndRender();
    }
}

// Update total task count in header
function updateTotalTaskCount() {
    const totalCountElement = document.getElementById('totalTaskCount');
    if (!totalCountElement) return;
    
    // Only show if signed in and main content is visible
    const mainContent = document.getElementById('mainContent');
    if (!mainContent || mainContent.style.display === 'none') {
        totalCountElement.style.display = 'none';
        return;
    }
    
    const allTasks = getAllTasks();
    const activeTasks = allTasks.filter(task => !task.completed);
    
    // Show count of active (non-completed) tasks, formatted like bucket counts
    if (activeTasks.length > 0) {
        totalCountElement.textContent = activeTasks.length;
        totalCountElement.style.display = 'inline-block';
    } else {
        totalCountElement.style.display = 'none';
    }
}

// Show all active tasks in filtered view
function showAllActiveTasksView() {
    const filteredBucketView = document.getElementById('filteredBucketView');
    const bucketsContainer = document.querySelector('.buckets-container');
    const flaggedSection = document.getElementById('flaggedSection');
    const dayBucketsContainer = document.querySelector('.day-buckets-container');
    const completedButtonContainer = document.querySelector('.completed-button-container');
    const completedView = document.getElementById('completedView');
    
    if (filteredBucketView && bucketsContainer) {
        bucketsContainer.style.display = 'none';
        if (flaggedSection) flaggedSection.style.display = 'none';
        if (dayBucketsContainer) dayBucketsContainer.style.display = 'none';
        if (completedButtonContainer) completedButtonContainer.style.display = 'none';
        if (completedView) completedView.style.display = 'none';
        filteredBucketView.style.display = 'block';
        
        // Set a special bucket name for "all active"
        const filteredBucket = filteredBucketView.querySelector('.filtered-bucket');
        if (filteredBucket) {
            filteredBucket.setAttribute('data-bucket', 'all-active');
        }
        
        renderAllActiveTasksView();
    }
}

// Render all active tasks view
function renderAllActiveTasksView() {
    const filteredTasksGrid = document.getElementById('filteredBucketTasksGrid');
    const filteredCountElement = document.getElementById('count-filtered-bucket');
    const filteredTitleElement = document.getElementById('filtered-bucket-title');
    if (!filteredTasksGrid) return;
    
    // Update title
    if (filteredTitleElement) {
        filteredTitleElement.textContent = 'All Active Tasks';
    }
    
    // Get all active (non-completed) tasks
    const allTasks = getAllTasks();
    const activeTasks = allTasks.filter(task => !task.completed && !task.flagged);
    
    // Update count
    if (filteredCountElement) {
        filteredCountElement.textContent = activeTasks.length;
    }
    
    // Sort tasks by bucket, then by order
    activeTasks.sort((a, b) => {
        // First sort by bucket
        const bucketOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 
                             'this-week', 'next-week', 'this-month', 'next-month', 
                             'recurring', 'someday'];
        const aBucketIndex = bucketOrder.indexOf(a.bucket);
        const bBucketIndex = bucketOrder.indexOf(b.bucket);
        
        if (aBucketIndex !== bBucketIndex) {
            return aBucketIndex - bBucketIndex;
        }
        
        // Then sort by order
        const orderA = a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const orderB = b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return orderA - orderB;
    });
    
    if (activeTasks.length === 0) {
        filteredTasksGrid.innerHTML = '<div class="empty-bucket">No active tasks</div>';
    } else {
        filteredTasksGrid.innerHTML = activeTasks.map(task => createTaskCard(task)).join('');
        
        // Attach event listeners
        activeTasks.forEach(task => {
            attachTaskEventListeners(task.id);
        });
        
        // Optimize card sizing for filtered tasks (wider cards)
        optimizeBucketCardSizing(filteredTasksGrid, activeTasks.length);
    }
}

// Save and render
async function saveAndRender() {
    // Move tasks from past day buckets to the next weekday before saving
    // This is called after tasks are moved/dropped, so it will handle moving old tasks forward
    // Newly dropped tasks are protected by the 2-second check in movePastDayTasksForward
    if (typeof movePastDayTasksForward === 'function' && typeof tasks !== 'undefined' && tasks.length > 0) {
        movePastDayTasksForward();
    }
    
    const data = getTasksData();
    
    // Only save to localStorage if signed in
    if (isSignedIn()) {
        saveLocalTasks(data);
        // Auto-sync if signed in (debounced)
        debouncedSync();
    } else {
        // If signed out, don't save to localStorage
        // Clear any existing data
        localStorage.removeItem('tasks');
    }
    
    // Update selection visuals after render
    updateTaskSelectionVisuals();
    
    // Check which view is active and render accordingly
    const completedView = document.getElementById('completedView');
    const filteredBucketView = document.getElementById('filteredBucketView');
    
    if (completedView && completedView.style.display !== 'none') {
        renderCompletedView();
    } else if (filteredBucketView && filteredBucketView.style.display !== 'none') {
        // Get the current bucket being viewed
        const filteredBucket = filteredBucketView.querySelector('.filtered-bucket');
        const bucketName = filteredBucket ? filteredBucket.getAttribute('data-bucket') : null;
        if (bucketName === 'all-active') {
            renderAllActiveTasksView();
        } else if (bucketName) {
            renderFilteredBucketView(bucketName);
        }
    } else {
        renderBuckets();
    }
    
    // Update selection visuals again after rendering
    updateTaskSelectionVisuals();
    
    // Update total task count
    updateTotalTaskCount();
}

// Debounced sync function
let syncTimeout;
function debouncedSync() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            const data = getTasksData();
            await saveTasksFile(data);
        } catch (error) {
            console.error('Auto-sync failed:', error);
        }
    }, 2000);
}

// Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(day) {
    if (day >= 11 && day <= 13) {
        return 'th';
    }
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

// Format date (date should already be a Date object, not a string)
function formatDate(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateYear = date.getFullYear();
    const todayYear = today.getFullYear();
    
    // Format as abbreviated day of week, abbreviated month, and day
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    
    // Include year only if it's in the following year (next year)
    if (dateYear > todayYear) {
        return `${dayOfWeek}, ${month} ${day}, ${dateYear}`;
    } else {
        return `${dayOfWeek}, ${month} ${day}`;
    }
}

// Convert YYYY-MM-DD date string to mm/dd/yy format for editing
function formatDateForEdit(dateString) {
    if (!dateString) return '';
    const dateParts = dateString.split('-');
    if (dateParts.length === 3) {
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]);
        const day = parseInt(dateParts[2]);
        const monthStr = String(month).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const yearStr = String(year).slice(-2);
        return `${monthStr}/${dayStr}/${yearStr}`;
    }
    return dateString;
}

// Edit just the due date of a task
function editTaskDueDate(taskId, dueDateElement) {
    const task = getTaskById(taskId);
    if (!task) return;
    
    // Create an input element
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'due-date-input';
    // Convert stored date (YYYY-MM-DD) to mm/dd/yy format for editing
    input.value = task.dueDate ? formatDateForEdit(task.dueDate) : '';
    input.placeholder = 'e.g., 01/15/24, jan 15, january 15 2024, tomorrow, or next week';
    input.style.cssText = 'padding: 0.25rem 0.5rem; border: 1px solid var(--primary-color); border-radius: 4px; font-size: 0.875rem; width: 200px;';
    
    // Replace the due date element with the input
    const parent = dueDateElement.parentElement;
    dueDateElement.style.display = 'none';
    parent.insertBefore(input, dueDateElement);
    input.focus();
    input.select();
    
    // Handle saving
    const saveDueDate = () => {
        const inputValue = input.value.trim();
        
        // If input is empty, remove the date
        if (!inputValue) {
            const task = getTaskById(taskId);
            if (task) {
                task.dueDate = null;
                task.updatedAt = new Date().toISOString();
                saveAndRender();
            }
            return;
        }
        
        const parsedDate = parseNaturalDate(inputValue);
        
        // If date couldn't be parsed, show error
        if (!parsedDate) {
            // Show error message
            input.style.borderColor = 'var(--danger-color)';
            input.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            
            // Create error message element
            let errorMsg = parent.querySelector('.date-error-message');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.className = 'date-error-message';
                errorMsg.style.cssText = 'color: var(--danger-color); font-size: 0.75rem; margin-top: 0.25rem; padding: 0.25rem 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;';
                parent.insertBefore(errorMsg, input.nextSibling);
            }
            errorMsg.textContent = `Unable to parse date "${inputValue}". Try formats like: 01/15/24, jan 15, january 15 2024, tomorrow, or next week`;
            
            // Remove error on next input
            input.addEventListener('input', () => {
                input.style.borderColor = '';
                input.style.backgroundColor = '';
                if (errorMsg) {
                    errorMsg.remove();
                }
            }, { once: true });
            
            return; // Don't save if date is invalid
        }
        
        // Update the task
        const task = getTaskById(taskId);
        if (task) {
            task.dueDate = parsedDate;
            task.updatedAt = new Date().toISOString();
            saveAndRender();
        }
    };
    
    // Handle cancel
    const cancelEdit = () => {
        input.remove();
        dueDateElement.style.display = '';
    };
    
    // Save on Enter or blur
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveDueDate();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
    
    input.addEventListener('blur', () => {
        // Small delay to allow Enter key to process first
        setTimeout(() => {
            if (document.contains(input)) {
                const inputValue = input.value.trim();
                // Only save if there's a value, otherwise remove the date
                if (inputValue) {
                    // Check if date can be parsed before saving
                    const parsedDate = parseNaturalDate(inputValue);
                    if (!parsedDate) {
                        // Don't save on blur if date is invalid - let user fix it
                        return;
                    }
                    saveDueDate();
                } else {
                    // Remove the due date
                    const task = getTaskById(taskId);
                    if (task) {
                        task.dueDate = null;
                        task.updatedAt = new Date().toISOString();
                        saveAndRender();
                    }
                }
            }
        }, 200);
    });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Custom confirmation dialog
function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirmDialog');
        const titleEl = document.getElementById('confirmDialogTitle');
        const messageEl = document.getElementById('confirmDialogMessage');
        const confirmBtn = document.getElementById('confirmDialogConfirm');
        const cancelBtn = document.getElementById('confirmDialogCancel');
        
        // Set content
        titleEl.textContent = title;
        messageEl.textContent = message;
        
        // Show dialog
        dialog.classList.add('show');
        
        // Remove existing listeners to prevent duplicates
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        // Add new listeners
        newConfirmBtn.addEventListener('click', () => {
            dialog.classList.remove('show');
            resolve(true);
        });
        
        newCancelBtn.addEventListener('click', () => {
            dialog.classList.remove('show');
            resolve(false);
        });
        
        // Close on backdrop click
        const backdropClick = (e) => {
            if (e.target === dialog) {
                dialog.classList.remove('show');
                dialog.removeEventListener('click', backdropClick);
                resolve(false);
            }
        };
        dialog.addEventListener('click', backdropClick);
        
        // Close on Escape key
        const escapeKey = (e) => {
            if (e.key === 'Escape') {
                dialog.classList.remove('show');
                document.removeEventListener('keydown', escapeKey);
                resolve(false);
            }
        };
        document.addEventListener('keydown', escapeKey);
    });
}

// Initialize UI event listeners
function initializeUI() {
    // Event delegation for flag button clicks - this ensures it works even after DOM changes
    document.addEventListener('click', (e) => {
        const flagButton = e.target.closest('.flag-task');
        if (flagButton) {
            e.stopPropagation();
            e.preventDefault();
            const taskId = flagButton.getAttribute('data-id') || flagButton.closest('[data-task-id]')?.getAttribute('data-task-id');
            if (taskId) {
                try {
                    toggleTaskFlag(taskId);
                    saveAndRender();
                } catch (error) {
                    console.error('Error toggling task flag:', error);
                    alert('Failed to toggle flag. Please try again.');
                }
            }
        }
    });
    
    // Add task button
    document.getElementById('addTaskBtn').addEventListener('click', () => {
        // Explicitly set to 'this-week' when clicking Add Task button
        const bucketSelect = document.getElementById('taskBucket');
        if (bucketSelect) {
            bucketSelect.value = 'this-week';
        }
        openTaskModal();
    });
    
    // Keyboard shortcut: 'q' to open add task modal
    document.addEventListener('keydown', (e) => {
        // Only trigger if not typing in an input, textarea, or select
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable
        );
        
        // Press 'q' to open add task modal (but not when typing in inputs)
        if (e.key === 'q' && !isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            const modal = document.getElementById('taskModal');
            // Only open if modal is not already open
            if (modal && !modal.classList.contains('active')) {
                // Explicitly set to 'this-week' when using keyboard shortcut
                const bucketSelect = document.getElementById('taskBucket');
                if (bucketSelect) {
                    bucketSelect.value = 'this-week';
                }
                openTaskModal();
            }
        }
    });

    // Modal close buttons
    document.getElementById('closeModal').addEventListener('click', closeTaskModal);
    
    // Bulk edit modal event listeners
    const closeBulkEditModalBtn = document.getElementById('closeBulkEditModal');
    const cancelBulkEditBtn = document.getElementById('cancelBulkEditBtn');
    const bulkEditForm = document.getElementById('bulkEditForm');
    const bulkEditModal = document.getElementById('bulkEditModal');
    
    if (closeBulkEditModalBtn) {
        closeBulkEditModalBtn.addEventListener('click', closeBulkEditModal);
    }
    
    if (cancelBulkEditBtn) {
        cancelBulkEditBtn.addEventListener('click', () => {
            closeBulkEditModal();
        });
    }
    
    if (bulkEditForm) {
        bulkEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleBulkEditSubmit();
        });
    }
    
    if (bulkEditModal) {
        bulkEditModal.addEventListener('click', (e) => {
            if (e.target === bulkEditModal) {
                closeBulkEditModal();
            }
        });
    }
    
    // ESC key to clear selection
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (selectedTasks.size > 0) {
                clearTaskSelection();
            } else if (bulkEditModal && bulkEditModal.classList.contains('active')) {
                closeBulkEditModal();
            }
        }
    });
    
    // Click outside task cards to clear selection
    // Use mousedown to track potential drag operations
    let mouseDownTime = 0;
    let mouseDownTarget = null;
    
    document.addEventListener('mousedown', (e) => {
        mouseDownTime = Date.now();
        mouseDownTarget = e.target;
    });
    
    document.addEventListener('click', (e) => {
        // Don't clear if we're currently dragging or just finished dragging
        if (isDragging || hasDragged) {
            // Reset hasDragged after a delay
            if (hasDragged) {
                setTimeout(() => {
                    hasDragged = false;
                }, 300);
            }
            return;
        }
        
        // Don't clear if currently dragging (check for dragging class as backup)
        if (document.querySelector('.task-card.dragging')) return;
        
        // If this click happened very quickly after mousedown on a draggable element,
        // it might be part of a drag operation - skip it
        const timeSinceMouseDown = Date.now() - mouseDownTime;
        if (timeSinceMouseDown < 200 && mouseDownTarget) {
            const wasDraggable = mouseDownTarget.closest('[draggable="true"]') || 
                                 mouseDownTarget.closest('.task-card');
            if (wasDraggable) {
                return;
            }
        }
        
        // Only clear if there are selected tasks
        if (selectedTasks.size === 0) return;
        
        // Don't clear if clicking on:
        // - Task cards
        // - Buttons (including bulk edit buttons)
        // - Modals or modal content
        // - Form inputs
        // - Links
        // - Bucket areas (where drops happen)
        const target = e.target;
        const isTaskCard = target.closest('.task-card');
        const isButton = target.closest('button') || target.tagName === 'BUTTON';
        const isModal = target.closest('.modal') || target.closest('.modal-content');
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
        const isLink = target.tagName === 'A' || target.closest('a');
        const isBulkEditIndicator = target.closest('#bulkEditIndicator') || target.closest('.bulk-edit-indicator');
        const isBucketHeader = target.closest('.bucket-header');
        const isBucketCount = target.closest('.bucket-count') || target.closest('.total-task-count');
        const isBucketTasks = target.closest('.bucket-tasks');
        const isBucket = target.closest('.bucket');
        
        // If clicking on any of these, don't clear selection
        if (isTaskCard || isButton || isModal || isInput || isLink || isBulkEditIndicator || isBucketHeader || isBucketCount || isBucketTasks || isBucket) {
            return;
        }
        
        // Click is on empty space, clear selection
        clearTaskSelection();
    });

    // Task form submission
    document.getElementById('taskForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleTaskSubmit();
    });
    
    // Title textarea: Enter to submit, Shift+Enter for new line
    const taskTitle = document.getElementById('taskTitle');
    if (taskTitle) {
        taskTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTaskSubmit();
            }
            // Shift+Enter will allow default behavior (new line)
        });
    }

    // Delete button
    document.getElementById('deleteBtn').addEventListener('click', async () => {
        if (currentEditingTaskId) {
            const confirmed = await showConfirmDialog(
                'Delete Task',
                'Are you sure you want to delete this task? This action cannot be undone.'
            );
            if (confirmed) {
                deleteTask(currentEditingTaskId);
                closeTaskModal();
                saveAndRender();
            }
        }
    });

    // Recurring checkbox
    document.getElementById('taskRecurring').addEventListener('change', (e) => {
        document.getElementById('recurringOptions').style.display = e.target.checked ? 'block' : 'none';
        if (e.target.checked) {
            document.getElementById('taskBucket').value = 'recurring';
        }
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    // Function to update clear button visibility
    const updateClearButton = () => {
        if (searchClear && searchInput) {
            searchClear.style.display = searchInput.value.trim() ? 'flex' : 'none';
        }
    };
    
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            updateClearButton();
            renderBuckets();
        });
        // Update on initial load
        updateClearButton();
    }
    
    // Clear button click handler
    if (searchClear) {
        searchClear.addEventListener('click', (e) => {
            e.stopPropagation();
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                updateClearButton();
                renderBuckets();
            }
        });
    }

    // Click outside modal to close
    document.getElementById('taskModal').addEventListener('click', (e) => {
        if (e.target.id === 'taskModal') {
            closeTaskModal();
        }
    });
    
    // Set up drag and drop for bucket headers (for minimized buckets)
    document.querySelectorAll('.bucket-header').forEach(header => {
        header.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!draggedTaskId) return;
            
            const bucket = header.closest('.bucket');
            if (!bucket) return;
            
            const bucketTasks = bucket.querySelector('.bucket-tasks');
            // Highlight header if bucket is collapsed (whether it's empty or manually collapsed)
            if (bucketTasks && (bucketTasks.style.display === 'none' || bucket.classList.contains('bucket-collapsed'))) {
                header.classList.add('drag-over');
            }
        });
        
        header.addEventListener('dragleave', (e) => {
            if (!header.contains(e.relatedTarget)) {
                header.classList.remove('drag-over');
            }
        });
        
        header.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            header.classList.remove('drag-over');
            
            if (!draggedTaskId) return;
            
            const bucket = header.closest('.bucket');
            if (!bucket) return;
            
            const bucketId = bucket.getAttribute('data-bucket');
            const bucketTasks = bucket.querySelector('.bucket-tasks');
            
            if (bucketTasks && draggedTaskId && draggedTaskIds.length > 0) {
                // Preserve the task IDs in case they get cleared
                const taskIdsToMove = [...draggedTaskIds];
                const primaryTaskId = draggedTaskId;
                
                // All buckets can accept drops on their headers when collapsed
                // If collapsed, expand it first, then handle the drop
                if (bucketTasks.style.display === 'none') {
                    // Expand the bucket first
                    bucketTasks.style.display = 'flex';
                    const bucketContainer = bucket;
                    if (bucketContainer) {
                        bucketContainer.classList.remove('bucket-collapsed');
                    }
                    // Update toggle button if it exists
                    const toggle = document.getElementById(`${bucketId}-toggle`);
                    if (toggle) {
                        toggle.textContent = '▲';
                    }
                    // Wait a bit for the bucket to expand, then handle the drop
                    // Create a proper event-like object with all necessary properties
                    setTimeout(() => {
                        try {
                            // Restore draggedTaskIds if they were cleared
                            if (draggedTaskIds.length === 0) {
                                draggedTaskIds = taskIdsToMove;
                                draggedTaskId = primaryTaskId;
                            }
                            
                            // Ensure bucketTasks is still valid
                            const targetBucketTasks = bucket.querySelector('.bucket-tasks');
                            if (!targetBucketTasks) {
                                console.error('Bucket tasks element not found after expansion');
                                // Fallback: directly move all tasks
                                taskIdsToMove.forEach(taskId => {
                                    try {
                                        moveTaskToBucket(taskId, bucketId);
                                    } catch (err) {
                                        console.error(`Error moving task ${taskId}:`, err);
                                    }
                                });
                                clearTaskSelection();
                                saveAndRender();
                                return;
                            }
                            
                            const dropEvent = {
                                preventDefault: () => {},
                                stopPropagation: () => {},
                                currentTarget: targetBucketTasks,
                                clientX: e.clientX,
                                clientY: e.clientY
                            };
                            handleDrop(dropEvent);
                        } catch (error) {
                            console.error('Error handling drop on collapsed bucket header:', error);
                            // Fallback: directly move all tasks to the bucket
                            try {
                                taskIdsToMove.forEach(taskId => {
                                    try {
                                        moveTaskToBucket(taskId, bucketId);
                                    } catch (err) {
                                        console.error(`Error moving task ${taskId}:`, err);
                                    }
                                });
                                clearTaskSelection();
                                saveAndRender();
                            } catch (moveError) {
                                console.error('Error moving tasks to bucket:', moveError);
                            }
                        }
                    }, 150); // Increased timeout to ensure bucket is fully expanded and rendered
                } else {
                    // Bucket is already expanded, handle drop normally
                    try {
                        const dropEvent = {
                            preventDefault: () => {},
                            stopPropagation: () => {},
                            currentTarget: bucketTasks,
                            clientX: e.clientX,
                            clientY: e.clientY
                        };
                        handleDrop(dropEvent);
                    } catch (error) {
                        console.error('Error handling drop on expanded bucket header:', error);
                        // Fallback: directly move all tasks to the bucket
                        try {
                            taskIdsToMove.forEach(taskId => {
                                try {
                                    moveTaskToBucket(taskId, bucketId);
                                } catch (err) {
                                    console.error(`Error moving task ${taskId}:`, err);
                                }
                            });
                            clearTaskSelection();
                            saveAndRender();
                        } catch (moveError) {
                            console.error('Error moving tasks to bucket:', moveError);
                        }
                    }
                }
            }
        });
    });
    
    // Set up drag and drop for bucket tasks using event delegation
    // This ensures listeners work even after DOM is re-rendered
    document.addEventListener('dragover', (e) => {
        const el = e.target.closest('.bucket-tasks');
        if (!el) return;
        
        // Only handle if this is a bucket-tasks element
        if (el.classList.contains('bucket-tasks')) {
            e.preventDefault();
            e.stopPropagation();
            el.classList.add('drag-over');
            
            if (!draggedTaskId) return;
            
            // Find which task we're hovering over based on both X and Y position (for grid layout)
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const taskCards = Array.from(el.querySelectorAll('.task-card'))
                .filter(card => !draggedTaskIds.includes(card.getAttribute('data-task-id')));
            
            // Remove all drag-over-task classes and drop indicators first
            document.querySelectorAll('.task-card').forEach(card => {
                card.classList.remove('drag-over-task', 'drag-over-before', 'drag-over-after', 'drag-over-left', 'drag-over-right');
            });
            
            // Remove any existing drop indicators and previews
            const existingIndicator = el.querySelector('.drop-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            const existingPreview = el.querySelector('.drop-preview');
            if (existingPreview) {
                existingPreview.remove();
            }
            
            // Calculate where the card will actually be placed (matching the drop logic)
            const containerRect = el.getBoundingClientRect();
            let previewTop, previewLeft, previewWidth, previewHeight;
            
            // Get actual card dimensions from an existing card if available, otherwise use defaults
            // Preview should be slightly smaller (85% scale) to indicate it's a preview, not the actual card
            let previewCardWidth = 170;
            let previewCardHeight = 102;
            if (taskCards.length > 0) {
                const sampleCard = taskCards[0];
                const sampleRect = sampleCard.getBoundingClientRect();
                previewCardWidth = sampleRect.width * 0.85;
                previewCardHeight = sampleRect.height * 0.85;
            }
            
            // Get all cards with their positions (matching drop logic)
            const cardsWithPositions = taskCards.map(card => {
                const rect = card.getBoundingClientRect();
                return {
                    card: card,
                    id: card.getAttribute('data-task-id'),
                    rect: rect,
                    centerX: rect.left + (rect.width / 2),
                    centerY: rect.top + (rect.height / 2),
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right
                };
            });
            
            // Check if mouse is directly over a card
            let cardUnderMouse = cardsWithPositions.find(c => 
                mouseX >= c.left && mouseX <= c.right &&
                mouseY >= c.top && mouseY <= c.bottom
            );
            
            if (cardUnderMouse) {
                // Dropping directly on a card - show preview next to it
                if (mouseX < cardUnderMouse.centerX) {
                    // Left side - preview to the left
                    previewLeft = Math.max(0, cardUnderMouse.left - containerRect.left - previewCardWidth - 8);
                    previewTop = cardUnderMouse.top - containerRect.top;
                } else {
                    // Right side - preview to the right
                    previewLeft = Math.min(
                        containerRect.width - previewCardWidth,
                        cardUnderMouse.right - containerRect.left + 8
                    );
                    previewTop = cardUnderMouse.top - containerRect.top;
                }
                previewWidth = previewCardWidth + 'px';
                previewHeight = previewCardHeight + 'px';
            } else if (cardsWithPositions.length > 0) {
                // Check if we're above the first card (for column layouts)
                const firstCard = cardsWithPositions.reduce((first, card) => {
                    if (!first) return card;
                    // Find the topmost card, and if tied, the leftmost
                    if (card.top < first.top || (card.top === first.top && card.left < first.left)) {
                        return card;
                    }
                    return first;
                }, null);
                
                if (firstCard && mouseY < firstCard.top - 20) {
                    // Above the first card - show preview above it
                    previewLeft = firstCard.left - containerRect.left;
                    previewTop = Math.max(0, firstCard.top - containerRect.top - previewCardHeight - 8);
                    previewWidth = previewCardWidth + 'px';
                    previewHeight = previewCardHeight + 'px';
                } else {
                    // Dropping in empty space - find which row we're in (matching drop logic)
                const rowTolerance = 50;
                const rows = [];
                
                cardsWithPositions.forEach(card => {
                    let foundRow = false;
                    for (let row of rows) {
                        if (Math.abs(card.top - row.top) < rowTolerance) {
                            row.cards.push(card);
                            foundRow = true;
                            break;
                        }
                    }
                    if (!foundRow) {
                        rows.push({
                            top: card.top,
                            bottom: card.bottom,
                            cards: [card]
                        });
                    }
                });
                
                rows.sort((a, b) => a.top - b.top);
                
                // Find which row the mouse is in
                let targetRow = null;
                let isAboveFirstRow = false;
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (mouseY >= row.top - rowTolerance && mouseY <= row.bottom + rowTolerance) {
                        targetRow = row;
                        break;
                    } else if (mouseY < row.top) {
                        // Above this row - check if it's the first row
                        if (i === 0) {
                            // Above the first row - show preview above the first card
                            isAboveFirstRow = true;
                            rows[0].cards.sort((a, b) => a.left - b.left);
                            const firstCard = rows[0].cards[0];
                            previewLeft = firstCard.left - containerRect.left;
                            previewTop = Math.max(0, firstCard.top - containerRect.top - previewCardHeight - 8);
                            break;
                        } else {
                            // Above a later row - show preview at start of this row
                            targetRow = { top: row.top, bottom: row.top, cards: [] };
                            break;
                        }
                    }
                }
                
                // If mouse is below all rows
                if (!targetRow && !isAboveFirstRow && rows.length > 0) {
                    const lastRow = rows[rows.length - 1];
                    lastRow.cards.sort((a, b) => a.left - b.left);
                    const lastCard = lastRow.cards[lastRow.cards.length - 1];
                    previewLeft = lastCard.right - containerRect.left + 8;
                    previewTop = lastCard.top - containerRect.top;
                } else if (!isAboveFirstRow && targetRow && targetRow.cards.length > 0) {
                    // Row has cards - find position within row
                    targetRow.cards.sort((a, b) => a.left - b.left);
                    
                    // Find which card position in the row
                    let foundPosition = false;
                    for (let i = 0; i < targetRow.cards.length; i++) {
                        const card = targetRow.cards[i];
                        if (mouseX < card.centerX) {
                            // Insert before this card
                            previewLeft = Math.max(0, card.left - containerRect.left - previewCardWidth - 8);
                            previewTop = card.top - containerRect.top;
                            foundPosition = true;
                            break;
                        } else if (i === targetRow.cards.length - 1) {
                            // After last card in row
                            previewLeft = Math.min(
                                containerRect.width - previewCardWidth,
                                card.right - containerRect.left + 8
                            );
                            previewTop = card.top - containerRect.top;
                            foundPosition = true;
                        }
                    }
                    if (!foundPosition) {
                        // Default to after last card
                        const lastCard = targetRow.cards[targetRow.cards.length - 1];
                        previewLeft = Math.min(
                            containerRect.width - previewCardWidth,
                            lastCard.right - containerRect.left + 8
                        );
                        previewTop = lastCard.top - containerRect.top;
                    }
                } else {
                    // Empty row - show at start of row
                    if (rows.length > 0 && rows[0].cards.length > 0) {
                        rows[0].cards.sort((a, b) => a.left - b.left);
                        const firstCard = rows[0].cards[0];
                        previewLeft = Math.max(0, firstCard.left - containerRect.left - previewCardWidth - 8);
                        previewTop = firstCard.top - containerRect.top;
                    } else {
                        // No cards at all - show at top left
                        previewLeft = '0px';
                        previewTop = '8px';
                    }
                }
                
                previewWidth = previewCardWidth + 'px';
                previewHeight = previewCardHeight + 'px';
                }
            } else {
                // No cards - show at top
                previewLeft = '0px';
                previewTop = '8px';
                previewWidth = previewCardWidth + 'px';
                previewHeight = previewCardHeight + 'px';
            }
            
            // Add preview placeholder showing where task(s) will appear (only visual indicator)
            const preview = document.createElement('div');
            preview.className = 'drop-preview';
            preview.style.position = 'absolute';
            preview.style.top = (typeof previewTop === 'number' ? previewTop + 'px' : previewTop);
            preview.style.left = (typeof previewLeft === 'number' ? previewLeft + 'px' : previewLeft);
            preview.style.width = previewWidth;
            preview.style.height = previewHeight;
            preview.style.zIndex = '999';
            
            // Add count badge if multiple tasks
            if (draggedTaskIds.length > 1) {
                const countBadge = document.createElement('div');
                countBadge.className = 'drop-preview-count';
                countBadge.textContent = draggedTaskIds.length;
                preview.appendChild(countBadge);
            }
            
            el.appendChild(preview);
        }
    });
    
    document.addEventListener('dragleave', (e) => {
        const el = e.target.closest('.bucket-tasks');
        if (!el || !el.classList.contains('bucket-tasks')) return;
        
        // Only remove if leaving the bucket area, not just moving between children
        if (!el.contains(e.relatedTarget)) {
            el.classList.remove('drag-over');
            document.querySelectorAll('.task-card').forEach(card => {
                card.classList.remove('drag-over-task', 'drag-over-before', 'drag-over-after', 'drag-over-left', 'drag-over-right');
            });
            const indicator = el.querySelector('.drop-indicator');
            if (indicator) indicator.remove();
            const preview = el.querySelector('.drop-preview');
            if (preview) preview.remove();
        }
    });
    
    document.addEventListener('drop', (e) => {
        // Check if dropping on bucket-tasks
        const el = e.target.closest('.bucket-tasks');
        if (el && el.classList.contains('bucket-tasks')) {
            e.preventDefault();
            e.stopPropagation();
            // Create a synthetic event object with all necessary properties
            const dropEvent = {
                preventDefault: () => e.preventDefault(),
                stopPropagation: () => e.stopPropagation(),
                currentTarget: el,
                target: e.target,
                clientX: e.clientX,
                clientY: e.clientY,
                dataTransfer: e.dataTransfer
            };
            handleDrop(dropEvent);
            return;
        }
        
        // Also check flagged tasks container
        const flaggedContainer = document.getElementById('flaggedTasks');
        if (flaggedContainer && (e.target === flaggedContainer || flaggedContainer.contains(e.target))) {
            e.preventDefault();
            e.stopPropagation();
            const dropEvent = {
                preventDefault: () => e.preventDefault(),
                stopPropagation: () => e.stopPropagation(),
                currentTarget: flaggedContainer,
                target: e.target,
                clientX: e.clientX,
                clientY: e.clientY,
                dataTransfer: e.dataTransfer
            };
            handleDrop(dropEvent);
        }
    });
    
    // Click on empty space in bucket to add task with that bucket pre-selected
    document.addEventListener('click', (e) => {
        const el = e.target.closest('.bucket-tasks');
        if (!el || !el.classList.contains('bucket-tasks')) return;
        
        // Don't trigger if clicking on a task card or if we just dragged
        if (hasDragged) return;
        if (e.target.closest('.task-card')) return;
        
        // Get the bucket this container belongs to
        const bucket = el.closest('.bucket');
        if (!bucket) return;
        
        const bucketId = bucket.getAttribute('data-bucket');
        if (!bucketId) return;
        
        // Pre-select this bucket before opening modal
        const bucketSelect = document.getElementById('taskBucket');
        if (bucketSelect) {
            bucketSelect.value = bucketId;
        }
        
        // If recurring bucket, check the recurring checkbox
        if (bucketId === 'recurring') {
            const recurringCheckbox = document.getElementById('taskRecurring');
            if (recurringCheckbox) {
                recurringCheckbox.checked = true;
                // Mark to preserve recurring checkbox in openTaskModal
                recurringCheckbox.setAttribute('data-preserve-recurring', 'true');
                // Trigger change event to show recurring options
                recurringCheckbox.dispatchEvent(new Event('change'));
            }
        }
        
        openTaskModal();
    });
    
    // Set up drag and drop for flagged tasks section
    const flaggedTasksContainer = document.getElementById('flaggedTasks');
    if (flaggedTasksContainer) {
        flaggedTasksContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            flaggedTasksContainer.classList.add('drag-over');
            
            if (!draggedTaskId) return;
            
            // Find which task we're hovering over based on X position (horizontal layout)
            const mouseX = e.clientX;
            const taskCards = Array.from(flaggedTasksContainer.querySelectorAll('.task-card'));
            
            // Remove all drag-over-task classes first
            document.querySelectorAll('.task-card').forEach(card => {
                card.classList.remove('drag-over-task');
            });
            
            // Find the task card we're hovering over
            for (let i = 0; i < taskCards.length; i++) {
                const card = taskCards[i];
                if (card === draggedElement) continue;
                
                const cardRect = card.getBoundingClientRect();
                const cardCenterX = cardRect.left + cardRect.width / 2;
                
                if (mouseX < cardCenterX) {
                    // Hovering before this card - show insert indicator
                    card.classList.add('drag-over-task');
                    break;
                }
            }
        });
        
        flaggedTasksContainer.addEventListener('dragleave', (e) => {
            // Only remove if leaving the flagged area, not just moving between children
            if (!flaggedTasksContainer.contains(e.relatedTarget)) {
                flaggedTasksContainer.classList.remove('drag-over');
                document.querySelectorAll('.task-card').forEach(card => {
                    card.classList.remove('drag-over-task');
                });
            }
        });
        
        flaggedTasksContainer.addEventListener('drop', handleDrop);
        
        // Click on empty space in flagged section to add a flagged task
        flaggedTasksContainer.addEventListener('click', (e) => {
            // Don't trigger if clicking on a task card or if we just dragged
            if (hasDragged) return;
            if (e.target.closest('.task-card')) return;
            if (e.target.closest('.empty-flagged')) {
                // Clicking the empty message also triggers this, so we handle it here
                e.stopPropagation();
            }
            
            // Open add task modal with flag pre-checked
            const flagCheckbox = document.getElementById('taskFlagged');
            if (flagCheckbox) {
                flagCheckbox.checked = true;
                // Mark to preserve flag checkbox in openTaskModal
                flagCheckbox.setAttribute('data-preserve-flag', 'true');
            }
            // Default bucket to 'this-week' when adding from flagged section
            const bucketSelect = document.getElementById('taskBucket');
            if (bucketSelect) {
                bucketSelect.value = 'this-week';
            }
            openTaskModal();
        });
    }
    
    // Set up toggle for all buckets
    const dayBuckets = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const buckets = ['this-week', 'next-week', 'this-month', 'next-month', 'recurring', 'someday'];
    const topRowBuckets = ['this-week', 'next-week', 'this-month'];
    
    // Set up toggles for day buckets (always expanded)
    dayBuckets.forEach(bucketId => {
        const toggle = document.getElementById(`${bucketId}-toggle`);
        const tasks = document.getElementById(`bucket-${bucketId}`);
        const bucket = document.querySelector(`[data-bucket="${bucketId}"]`);
        
        if (toggle && tasks && bucket) {
            // Day buckets are always expanded
            tasks.style.display = 'flex';
            bucket.classList.remove('bucket-collapsed');
            toggle.textContent = '▲';
            
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = tasks.style.display === 'none';
                
                if (isCollapsed) {
                    tasks.style.display = 'flex';
                    bucket.classList.remove('bucket-collapsed');
                    toggle.textContent = '▲';
                    // Optimize card sizing after expanding
                    setTimeout(() => {
                        const taskCards = tasks.querySelectorAll('.task-card');
                        if (taskCards.length > 0) {
                            optimizeBucketCardSizing(tasks, taskCards.length);
                        }
                    }, 50);
                } else {
                    tasks.style.display = 'none';
                    bucket.classList.add('bucket-collapsed');
                    toggle.textContent = '▼';
                }
            });
        }
    });
    
    buckets.forEach(bucketId => {
        const toggle = document.getElementById(`${bucketId}-toggle`);
        const tasks = document.getElementById(`bucket-${bucketId}`);
        const bucket = document.querySelector(`[data-bucket="${bucketId}"]`);
        
        if (toggle && tasks && bucket) {
            // Check initial state - top row should be expanded
            const isTopRow = topRowBuckets.includes(bucketId);
            const isCurrentlyCollapsed = tasks.style.display === 'none';
            
            // If top row and collapsed, expand it
            if (isTopRow && isCurrentlyCollapsed) {
                tasks.style.display = 'flex';
                bucket.classList.remove('bucket-collapsed');
                toggle.textContent = '▲';
            } else if (!isTopRow && !isCurrentlyCollapsed) {
                // Bottom row should be collapsed
                tasks.style.display = 'none';
                bucket.classList.add('bucket-collapsed');
                toggle.textContent = '▼';
            }
            
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = tasks.style.display === 'none';
                
                if (isCollapsed) {
                    tasks.style.display = 'flex';
                    bucket.classList.remove('bucket-collapsed');
                    toggle.textContent = '▲';
                    // Optimize card sizing after expanding
                    setTimeout(() => {
                        const taskCards = tasks.querySelectorAll('.task-card');
                        if (taskCards.length > 0) {
                            optimizeBucketCardSizing(tasks, taskCards.length);
                        }
                    }, 50);
                } else {
                    tasks.style.display = 'none';
                    bucket.classList.add('bucket-collapsed');
                    toggle.textContent = '▼';
                }
            });
        }
    });
    
    // Task Manager title - link back to main page
    const taskManagerTitle = document.getElementById('taskManagerTitle');
    if (taskManagerTitle) {
        taskManagerTitle.addEventListener('click', () => {
            // Scroll to top of page
            window.scrollTo({ top: 0, behavior: 'smooth' });
            showMainView();
        });
    }
    
    // Completed button - show completed view
    const completedBtn = document.getElementById('completedBtn');
    const completedView = document.getElementById('completedView');
    const bucketsContainer = document.querySelector('.buckets-container');
    const flaggedSection = document.getElementById('flaggedSection');
    const backToMainBtn = document.getElementById('backToMainBtn');
    
    if (completedBtn && completedView) {
        completedBtn.addEventListener('click', () => {
            showCompletedView();
        });
    }
    
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', () => {
            showMainView();
        });
    }
    
    // Back button from filtered view
    const backToMainFromFilteredBtn = document.getElementById('backToMainFromFilteredBtn');
    if (backToMainFromFilteredBtn) {
        backToMainFromFilteredBtn.addEventListener('click', () => {
            showMainView();
        });
    }
    
    // Add click handlers to all bucket counts
    const allBuckets = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 
                        'this-week', 'next-week', 'this-month', 'next-month', 
                        'recurring', 'someday', 'completed'];
    
    allBuckets.forEach(bucketName => {
        const countElement = document.getElementById(`count-${bucketName}`);
        if (countElement) {
            // Make it look clickable
            countElement.style.cursor = 'pointer';
            countElement.title = 'Click to view all tasks in this bucket';
            
            countElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering bucket header click
                showFilteredBucketView(bucketName);
            });
        }
    });
    
    // Add click handler to total task count
    const totalTaskCount = document.getElementById('totalTaskCount');
    if (totalTaskCount) {
        totalTaskCount.title = 'Click to view all active tasks';
        totalTaskCount.addEventListener('click', (e) => {
            e.stopPropagation();
            showAllActiveTasksView();
        });
    }
    
    // Initialize Pomodoro timer
    initializePomodoro();
    
    // Add window resize listener to recalculate card sizes
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            optimizeAllBucketsCardSizing();
            // Also optimize day buckets
            const dayBuckets = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            dayBuckets.forEach(dayName => {
                const dayBucketElement = document.getElementById(`bucket-${dayName}`);
                if (dayBucketElement) {
                    const taskCards = dayBucketElement.querySelectorAll('.task-card');
                    if (taskCards.length > 0) {
                        optimizeBucketCardSizing(dayBucketElement, taskCards.length);
                    }
                }
            });
            // Also optimize flagged tasks
            const flaggedTasksContainer = document.getElementById('flaggedTasks');
            if (flaggedTasksContainer) {
                const taskCards = flaggedTasksContainer.querySelectorAll('.task-card');
                if (taskCards.length > 0) {
                    optimizeBucketCardSizing(flaggedTasksContainer, taskCards.length);
                }
            }
        }, 250); // Debounce resize events
    });
}

// Initialize Pomodoro timer event listeners
function initializePomodoro() {
    const pomodoroBtn = document.getElementById('pomodoroBtn');
    const pomodoroStart = document.getElementById('pomodoroStart');
    const pomodoroPause = document.getElementById('pomodoroPause');
    const pomodoroReset = document.getElementById('pomodoroReset');
    const pomodoroClose = document.getElementById('pomodoroClose');
    
    if (pomodoroBtn) {
        pomodoroBtn.addEventListener('click', () => {
            showPomodoroTimer();
        });
    }
    
    if (pomodoroStart) {
        pomodoroStart.addEventListener('click', startPomodoro);
    }
    
    if (pomodoroPause) {
        pomodoroPause.addEventListener('click', pausePomodoro);
    }
    
    if (pomodoroReset) {
        pomodoroReset.addEventListener('click', resetPomodoro);
    }
    
    if (pomodoroClose) {
        pomodoroClose.addEventListener('click', hidePomodoroTimer);
    }
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Show completed tasks view
function showCompletedView() {
    const completedView = document.getElementById('completedView');
    const bucketsContainer = document.querySelector('.buckets-container');
    const flaggedSection = document.getElementById('flaggedSection');
    const dayBucketsContainer = document.querySelector('.day-buckets-container');
    const completedButtonContainer = document.querySelector('.completed-button-container');
    
    if (completedView && bucketsContainer) {
        bucketsContainer.style.display = 'none';
        if (flaggedSection) flaggedSection.style.display = 'none';
        if (dayBucketsContainer) dayBucketsContainer.style.display = 'none';
        if (completedButtonContainer) completedButtonContainer.style.display = 'none';
        completedView.style.display = 'block';
        renderCompletedView();
    }
}

// Show main view
// Show sign-in page and hide main content
function showSignInPage() {
    const signInPage = document.getElementById('signInPage');
    const mainContent = document.getElementById('mainContent');
    const header = document.querySelector('.header');
    
    if (signInPage) signInPage.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    // Hide header controls when not signed in
    if (header) {
        const headerControls = header.querySelector('.header-controls');
        if (headerControls) headerControls.style.display = 'none';
    }
}

// Show main content and hide sign-in page
function showMainContent() {
    const signInPage = document.getElementById('signInPage');
    const mainContent = document.getElementById('mainContent');
    const header = document.querySelector('.header');
    
    if (signInPage) signInPage.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    // Show header controls when signed in
    if (header) {
        const headerControls = header.querySelector('.header-controls');
        if (headerControls) headerControls.style.display = 'flex';
    }
    
    // Update total task count when showing main content
    if (typeof updateTotalTaskCount === 'function') {
        updateTotalTaskCount();
    }
}

function showMainView() {
    const completedView = document.getElementById('completedView');
    const filteredBucketView = document.getElementById('filteredBucketView');
    const bucketsContainer = document.querySelector('.buckets-container');
    const flaggedSection = document.getElementById('flaggedSection');
    const dayBucketsContainer = document.querySelector('.day-buckets-container');
    const completedButtonContainer = document.querySelector('.completed-button-container');
    
    if (completedView && bucketsContainer) {
        completedView.style.display = 'none';
        if (filteredBucketView) filteredBucketView.style.display = 'none';
        bucketsContainer.style.display = 'grid';
        if (flaggedSection) flaggedSection.style.display = 'flex';
        if (dayBucketsContainer) dayBucketsContainer.style.display = 'grid';
        if (completedButtonContainer) completedButtonContainer.style.display = 'flex';
        renderBuckets();
        updateTotalTaskCount();
    }
}

// Render completed tasks view
function renderCompletedView() {
    const completedTasksGrid = document.getElementById('completedTasksGrid');
    const completedCountElement = document.getElementById('count-completed');
    if (!completedTasksGrid) return;
    
    const completedTasks = getAllTasks().filter(task => task.completed === true);
    
    // Update count
    if (completedCountElement) {
        completedCountElement.textContent = completedTasks.length;
    }
    
    // Sort by completed date (most recent first)
    completedTasks.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
    });
    
    if (completedTasks.length === 0) {
        completedTasksGrid.innerHTML = '';
    } else {
        completedTasksGrid.innerHTML = completedTasks.map(task => createTaskCard(task)).join('');
        
        // Attach event listeners (including delete functionality)
        completedTasks.forEach(task => {
            attachTaskEventListeners(task.id);
            // Add delete button back for completed tasks
            const card = document.querySelector(`[data-task-id="${task.id}"]`);
            if (card) {
                const taskActions = card.querySelector('.task-actions');
                if (taskActions && !taskActions.querySelector('.delete-task')) {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-task';
                    deleteBtn.setAttribute('data-id', task.id);
                    deleteBtn.title = 'Delete';
                    deleteBtn.textContent = '🗑️';
                    deleteBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const confirmed = await showConfirmDialog(
                            'Delete Task',
                            'Are you sure you want to delete this task? This action cannot be undone.'
                        );
                        if (confirmed) {
                            deleteTask(task.id);
                            saveAndRender();
                        }
                    });
                    taskActions.appendChild(deleteBtn);
                }
            }
        });
        
        // Optimize card sizing for completed tasks
        optimizeBucketCardSizing(completedTasksGrid, completedTasks.length);
    }
}

// Show filtered bucket view
function showFilteredBucketView(bucketName) {
    const filteredBucketView = document.getElementById('filteredBucketView');
    const bucketsContainer = document.querySelector('.buckets-container');
    const flaggedSection = document.getElementById('flaggedSection');
    const dayBucketsContainer = document.querySelector('.day-buckets-container');
    const completedButtonContainer = document.querySelector('.completed-button-container');
    const completedView = document.getElementById('completedView');
    
    if (filteredBucketView && bucketsContainer) {
        bucketsContainer.style.display = 'none';
        if (flaggedSection) flaggedSection.style.display = 'none';
        if (dayBucketsContainer) dayBucketsContainer.style.display = 'none';
        if (completedButtonContainer) completedButtonContainer.style.display = 'none';
        if (completedView) completedView.style.display = 'none';
        filteredBucketView.style.display = 'block';
        
        // Set the data-bucket attribute so we can refresh it later
        const filteredBucket = filteredBucketView.querySelector('.filtered-bucket');
        if (filteredBucket) {
            filteredBucket.setAttribute('data-bucket', bucketName);
        }
        
        renderFilteredBucketView(bucketName);
    }
}

// Render filtered bucket view
function renderFilteredBucketView(bucketName) {
    const filteredTasksGrid = document.getElementById('filteredBucketTasksGrid');
    const filteredCountElement = document.getElementById('count-filtered-bucket');
    const filteredTitleElement = document.getElementById('filtered-bucket-title');
    if (!filteredTasksGrid) return;
    
    // Get bucket name for display
    const bucketDisplayNames = {
        'monday': 'Monday',
        'tuesday': 'Tuesday',
        'wednesday': 'Wednesday',
        'thursday': 'Thursday',
        'friday': 'Friday',
        'this-week': '📅 This Week',
        'next-week': '📆 Next Week',
        'this-month': '🗓️ This Month',
        'next-month': '📋 Next Month',
        'recurring': '🔄 Recurring',
        'someday': '⭐ Someday',
        'completed': '✅ Completed'
    };
    
    const displayName = bucketDisplayNames[bucketName] || bucketName;
    
    // Update title
    if (filteredTitleElement) {
        filteredTitleElement.textContent = displayName;
    }
    
    // Get tasks for this bucket
    let bucketTasks = [];
    if (bucketName === 'completed') {
        bucketTasks = getAllTasks().filter(task => task.completed === true);
    } else {
        bucketTasks = getAllTasks().filter(task => 
            task.bucket === bucketName && 
            !task.completed && 
            !task.flagged
        );
    }
    
    // Update count
    if (filteredCountElement) {
        filteredCountElement.textContent = bucketTasks.length;
    }
    
    // Sort tasks
    if (bucketName === 'completed') {
        // Sort by completed date (most recent first)
        bucketTasks.sort((a, b) => {
            const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return dateB - dateA;
        });
    } else {
        // Sort by order or creation date
        bucketTasks.sort((a, b) => {
            const orderA = a.order || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const orderB = b.order || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return orderA - orderB;
        });
    }
    
    if (bucketTasks.length === 0) {
        filteredTasksGrid.innerHTML = '<div class="empty-bucket">No tasks in this bucket</div>';
    } else {
        filteredTasksGrid.innerHTML = bucketTasks.map(task => createTaskCard(task)).join('');
        
        // Attach event listeners
        bucketTasks.forEach(task => {
            attachTaskEventListeners(task.id);
        });
        
        // Optimize card sizing for filtered tasks (wider cards)
        optimizeBucketCardSizing(filteredTasksGrid, bucketTasks.length);
    }
}

// Pomodoro Timer
let pomodoroInterval = null;
let pomodoroTimeLeft = 25 * 60; // 25 minutes in seconds
let pomodoroIsRunning = false;
let pomodoroCurrentTaskId = null;
let pomodoroMode = 'work'; // 'work' or 'break'
let pomodoroWorkDuration = 25 * 60;
let pomodoroBreakDuration = 5 * 60;

function formatPomodoroTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updatePomodoroDisplay() {
    const timeDisplay = document.getElementById('pomodoroTime');
    if (timeDisplay) {
        timeDisplay.textContent = formatPomodoroTime(pomodoroTimeLeft);
    }
}

function startPomodoro() {
    if (pomodoroIsRunning) return;
    
    pomodoroIsRunning = true;
    const startBtn = document.getElementById('pomodoroStart');
    const pauseBtn = document.getElementById('pomodoroPause');
    if (startBtn) startBtn.style.display = 'none';
    if (pauseBtn) pauseBtn.style.display = 'inline-block';
    
    pomodoroInterval = setInterval(() => {
        pomodoroTimeLeft--;
        updatePomodoroDisplay();
        
        if (pomodoroTimeLeft <= 0) {
            completePomodoro();
        }
    }, 1000);
    
    // Highlight active task if one is selected
    if (pomodoroCurrentTaskId) {
        const taskCard = document.querySelector(`[data-task-id="${pomodoroCurrentTaskId}"]`);
        if (taskCard) {
            taskCard.classList.add('pomodoro-active');
        }
    }
}

function pausePomodoro() {
    if (!pomodoroIsRunning) return;
    
    pomodoroIsRunning = false;
    clearInterval(pomodoroInterval);
    const startBtn = document.getElementById('pomodoroStart');
    const pauseBtn = document.getElementById('pomodoroPause');
    if (startBtn) startBtn.style.display = 'inline-block';
    if (pauseBtn) pauseBtn.style.display = 'none';
}

function resetPomodoro() {
    pausePomodoro();
    pomodoroTimeLeft = pomodoroMode === 'work' ? pomodoroWorkDuration : pomodoroBreakDuration;
    updatePomodoroDisplay();
    
    // Remove highlight
    if (pomodoroCurrentTaskId) {
        const taskCard = document.querySelector(`[data-task-id="${pomodoroCurrentTaskId}"]`);
        if (taskCard) {
            taskCard.classList.remove('pomodoro-active');
        }
    }
}

function completePomodoro() {
    pausePomodoro();
    
    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(
            pomodoroMode === 'work' ? 'Pomodoro Complete!' : 'Break Complete!',
            {
                body: pomodoroMode === 'work' 
                    ? 'Time for a break!' 
                    : 'Ready to get back to work?',
                icon: '🍅'
            }
        );
    }
    
    // Switch mode
    if (pomodoroMode === 'work') {
        pomodoroMode = 'break';
        pomodoroTimeLeft = pomodoroBreakDuration;
        alert('Pomodoro complete! Time for a 5-minute break.');
    } else {
        pomodoroMode = 'work';
        pomodoroTimeLeft = pomodoroWorkDuration;
        alert('Break complete! Ready for another Pomodoro?');
    }
    
    updatePomodoroDisplay();
    
    // Remove highlight
    if (pomodoroCurrentTaskId) {
        const taskCard = document.querySelector(`[data-task-id="${pomodoroCurrentTaskId}"]`);
        if (taskCard) {
            taskCard.classList.remove('pomodoro-active');
        }
    }
}

function showPomodoroTimer(taskId = null) {
    const container = document.getElementById('pomodoroContainer');
    if (container) {
        container.style.display = 'block';
        pomodoroCurrentTaskId = taskId;
        
        // Update task info display
        const taskInfo = document.getElementById('pomodoroTaskInfo');
        if (taskId) {
            const task = getTaskById(taskId);
            if (task && taskInfo) {
                taskInfo.textContent = `Working on: ${task.title}`;
            }
        } else {
            if (taskInfo) {
                taskInfo.textContent = 'No task selected';
            }
        }
        
        updatePomodoroDisplay();
    }
}

function hidePomodoroTimer() {
    pausePomodoro();
    const container = document.getElementById('pomodoroContainer');
    if (container) {
        container.style.display = 'none';
    }
    
    // Remove highlight
    if (pomodoroCurrentTaskId) {
        const taskCard = document.querySelector(`[data-task-id="${pomodoroCurrentTaskId}"]`);
        if (taskCard) {
            taskCard.classList.remove('pomodoro-active');
        }
    }
    
    pomodoroCurrentTaskId = null;
}

// Parse natural language date
// Helper function to format date as YYYY-MM-DD without timezone issues
function formatDateAsYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseNaturalDate(input) {
    if (!input || !input.trim()) return null;
    
    const text = input.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check for specific patterns
    if (text === 'today') {
        return formatDateAsYYYYMMDD(today);
    }
    
    if (text === 'tomorrow' || text === 'tom') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDateAsYYYYMMDD(tomorrow);
    }
    
    if (text === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return formatDateAsYYYYMMDD(yesterday);
    }
    
    // Day names (mon, tue, wed, thu, fri, sat, sun or full names)
    const dayNames = {
        'monday': 1, 'mon': 1,
        'tuesday': 2, 'tue': 2, 'tues': 2,
        'wednesday': 3, 'wed': 3,
        'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
        'friday': 5, 'fri': 5,
        'saturday': 6, 'sat': 6,
        'sunday': 7, 'sun': 7
    };
    
    if (dayNames[text] !== undefined) {
        const targetDay = dayNames[text];
        const currentDay = today.getDay() || 7; // Convert Sunday from 0 to 7
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) {
            daysToAdd += 7; // Next occurrence of that day
        }
        const date = new Date(today);
        date.setDate(today.getDate() + daysToAdd);
        return formatDateAsYYYYMMDD(date);
    }
    
    // "next week", "next month", etc.
    if (text.startsWith('next ')) {
        const period = text.substring(5);
        const date = new Date(today);
        
        if (period === 'week' || period === 'monday' || period === 'tuesday' || period === 'wednesday' || 
            period === 'thursday' || period === 'friday' || period === 'saturday' || period === 'sunday') {
            // Next week (Monday)
            const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
            date.setDate(today.getDate() + daysUntilMonday);
            return formatDateAsYYYYMMDD(date);
        }
        
        if (period === 'month') {
            date.setMonth(date.getMonth() + 1);
            date.setDate(1);
            return formatDateAsYYYYMMDD(date);
        }
    }
    
    // "in X days"
    const inDaysMatch = text.match(/^in\s+(\d+)\s+days?$/);
    if (inDaysMatch) {
        const days = parseInt(inDaysMatch[1]);
        const date = new Date(today);
        date.setDate(date.getDate() + days);
        return formatDateAsYYYYMMDD(date);
    }
    
    // Month names (jan, january, feb, february, etc.)
    const monthNames = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sep': 9, 'sept': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    };
    
    // Try to parse month name with day (e.g., "jan 15", "january 15", "jan 15 2024")
    const monthDayMatch = text.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{2,4}))?$/);
    if (monthDayMatch) {
        const monthName = monthDayMatch[1].toLowerCase();
        const day = parseInt(monthDayMatch[2]);
        const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : today.getFullYear();
        
        if (monthNames[monthName] && day >= 1 && day <= 31) {
            const month = monthNames[monthName];
            // Validate the date is valid
            const testDate = new Date(year, month - 1, day);
            if (testDate.getMonth() === month - 1 && testDate.getDate() === day) {
                // If 2-digit year, convert to 4-digit (assume 20xx if < 50, else 19xx)
                const fullYear = year < 100 ? (year < 50 ? 2000 + year : 1900 + year) : year;
                return formatDateAsYYYYMMDD(new Date(fullYear, month - 1, day));
            }
        }
    }
    
    // Try to parse as MM/DD or MM/DD/YY format
    const mmddMatch = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (mmddMatch) {
        const month = parseInt(mmddMatch[1]);
        const day = parseInt(mmddMatch[2]);
        let year = mmddMatch[3] ? parseInt(mmddMatch[3]) : today.getFullYear();
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            // If 2-digit year, convert to 4-digit (assume 20xx if < 50, else 19xx)
            if (year < 100) {
                year = year < 50 ? 2000 + year : 1900 + year;
            }
            
            // Validate the date is valid (handles invalid dates like Feb 30)
            const testDate = new Date(year, month - 1, day);
            if (testDate.getMonth() === month - 1 && testDate.getDate() === day) {
                // Construct date string directly to avoid timezone issues
                const monthStr = String(month).padStart(2, '0');
                const dayStr = String(day).padStart(2, '0');
                let dateStr = `${year}-${monthStr}-${dayStr}`;
                
                // If no year was provided and the date has already passed this year, use next year
                if (!mmddMatch[3]) {
                    const todayStr = formatDateAsYYYYMMDD(today);
                    if (dateStr < todayStr) {
                        year = year + 1;
                        dateStr = `${year}-${monthStr}-${dayStr}`;
                    }
                }
                
                return dateStr;
            }
        }
    }
    
    // Try to parse as standard date format (YYYY-MM-DD, MM/DD/YYYY, etc.)
    const dateMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
        let year, month, day;
        if (dateMatch[1]) {
            // YYYY-MM-DD format
            year = parseInt(dateMatch[1]);
            month = parseInt(dateMatch[2]);
            day = parseInt(dateMatch[3]);
        } else {
            // MM/DD/YYYY format
            month = parseInt(dateMatch[4]);
            day = parseInt(dateMatch[5]);
            year = parseInt(dateMatch[6]);
        }
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
            return formatDateAsYYYYMMDD(date);
        }
    }
    
    // If we can't parse it, return null (will be treated as no date)
    return null;
}

// Handle task form submission
function handleTaskSubmit() {
    const dueDateInput = document.getElementById('taskDueDate').value.trim();
    const dueDateField = document.getElementById('taskDueDate');
    
    // If user provided a due date but it can't be parsed, show error
    if (dueDateInput && !parseNaturalDate(dueDateInput)) {
        // Show error on the field
        dueDateField.style.borderColor = 'var(--danger-color)';
        dueDateField.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
        
        // Show error message
        let errorContainer = dueDateField.parentElement.querySelector('.date-error-message');
        if (!errorContainer) {
            errorContainer = document.createElement('div');
            errorContainer.className = 'date-error-message';
            errorContainer.style.cssText = 'color: var(--danger-color); font-size: 0.75rem; margin-top: 0.25rem; padding: 0.25rem 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 4px;';
            dueDateField.parentElement.appendChild(errorContainer);
        }
        errorContainer.textContent = `Unable to parse date "${dueDateInput}". Try formats like: 01/15/24, jan 15, january 15 2024, tomorrow, or next week`;
        
        // Remove error on next input
        dueDateField.addEventListener('input', () => {
            dueDateField.style.borderColor = '';
            dueDateField.style.backgroundColor = '';
            if (errorContainer) {
                errorContainer.remove();
            }
        }, { once: true });
        
        // Focus the field
        dueDateField.focus();
        return; // Don't submit if date is invalid
    }
    
    const parsedDate = parseNaturalDate(dueDateInput);
    
    const formData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        dueDate: parsedDate,
        bucket: document.getElementById('taskBucket').value,
        order: currentEditingTaskId ? getTaskById(currentEditingTaskId)?.order : Date.now(),
        tags: document.getElementById('taskTags').value.trim(),
        flagged: document.getElementById('taskFlagged').checked,
        recurring: {
            enabled: document.getElementById('taskRecurring').checked,
            type: document.getElementById('recurringType').value,
            interval: document.getElementById('recurringInterval').value
        }
    };

    if (!formData.title) {
        alert('Please enter a task title');
        return;
    }

    if (currentEditingTaskId) {
        updateTask(currentEditingTaskId, formData);
    } else {
        addTask(formData);
    }

    closeTaskModal();
    saveAndRender();
}

// Make functions globally available
window.handleDragStart = handleDragStart;
window.handleDragEnd = handleDragEnd;

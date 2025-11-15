// UI rendering and interactions
let currentEditingTaskId = null;
let draggedTaskId = null;
let dragStartPosition = null; // Store initial drag position

// Render all buckets
function renderBuckets() {
    const buckets = ['this-week', 'next-week', 'this-month', 'next-month', 'recurring', 'someday'];
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    
    // Get filtered tasks if searching
    const tasksToRender = searchTerm ? filterTasksBySearch(searchTerm) : getAllTasks();
    
    // Render flagged tasks section (exclude completed tasks from flagged section)
    renderFlaggedTasks(tasksToRender.filter(task => !task.completed));
    
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
                // Use order if it exists, otherwise fall back to createdAt
                const orderA = a.order ?? (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const orderB = b.order ?? (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                
                // Primary sort: by order
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                
                // Secondary sort: by due date
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                if (a.dueDate) return -1;
                if (b.dueDate) return 1;
                return 0;
            });
        }
        
        // Update count
        const countElement = document.getElementById(`count-${bucket}`);
        if (countElement) {
            let totalCount;
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
        } else {
            bucketElement.innerHTML = bucketTasks.map(task => createTaskCard(task)).join('');
            
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
                    openTaskModal();
                });
            }
        }
    });
    
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
                    <button class="pomodoro-start-task" data-id="${task.id}" title="Start Pomodoro">🍅</button>
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
    
    if (!card) return;

    card.querySelector('.flag-task')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTaskFlag(taskId);
        saveAndRender();
    });

    card.querySelector('.complete-task')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTaskCompletion(taskId);
        saveAndRender();
    });

    card.querySelector('.pomodoro-start-task')?.addEventListener('click', (e) => {
        e.stopPropagation();
        showPomodoroTimer(taskId);
    });
    
    // Make due date clickable to edit just the due date
    const dueDateElement = card.querySelector('.due-date');
    if (dueDateElement) {
        dueDateElement.addEventListener('click', (e) => {
            e.stopPropagation();
            editTaskDueDate(taskId, dueDateElement);
        });
    }
    
    // Make entire task card clickable to edit (but not if we just dragged)
    card.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons, due date, or if we just dragged
        if (hasDragged) return;
        if (e.target.closest('.task-actions')) return;
        if (e.target.closest('.due-date')) return;
        if (e.target.closest('.task-tags')) return;
        
        // Open edit modal
        openTaskModal(taskId);
    });
}

// Drag and Drop handlers
let hasDragged = false; // Track if we just performed a drag operation

function handleDragStart(event, taskId) {
    draggedTaskId = taskId;
    draggedElement = event.currentTarget;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/html', taskId);
    event.currentTarget.classList.add('dragging');
    hasDragged = false; // Reset flag at start of drag
    
    // Store initial drag position
    const rect = draggedElement.getBoundingClientRect();
    dragStartPosition = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

let draggedElement = null;

function handleDragEnd(event) {
    event.currentTarget.classList.remove('dragging');
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
        el.classList.remove('drag-over-task');
    });
    
    // Set flag to indicate we just dragged (prevent click event)
    hasDragged = true;
    
    // Reset flag after a short delay to allow click events again
    setTimeout(() => {
        hasDragged = false;
    }, 100);
    
    draggedTaskId = null;
    draggedElement = null;
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!draggedTaskId) return;
    
    // Mark that we've dragged (to prevent click event)
    hasDragged = true;
    
    const task = getTaskById(draggedTaskId);
    if (!task) return;
    
    // Check if dropping into flagged section
    const flaggedTasksContainer = document.getElementById('flaggedTasks');
    if (event.currentTarget === flaggedTasksContainer || flaggedTasksContainer?.contains(event.currentTarget)) {
        // Dropping into flagged section - flag the task
        if (!task.flagged) {
            try {
                toggleTaskFlag(draggedTaskId);
                saveAndRender();
            } catch (error) {
                console.error('Error flagging task:', error);
                alert('Failed to flag task');
            }
        } else {
            // Already flagged, just reorder within flagged section
            const mouseX = event.clientX;
            let insertBeforeTaskId = null;
            
            const taskCards = Array.from(flaggedTasksContainer.querySelectorAll('.task-card'))
                .filter(card => card.getAttribute('data-task-id') !== draggedTaskId);
            
            // Find which task we're dropping before based on X position (horizontal layout)
            for (let i = 0; i < taskCards.length; i++) {
                const card = taskCards[i];
                const cardRect = card.getBoundingClientRect();
                const cardCenterX = cardRect.left + (cardRect.width / 2);
                
                if (mouseX < cardCenterX) {
                    insertBeforeTaskId = card.getAttribute('data-task-id');
                    break;
                }
            }
            
            // Reorder flagged tasks (we'll need a special function for this)
            try {
                reorderFlaggedTask(draggedTaskId, insertBeforeTaskId);
                saveAndRender();
            } catch (error) {
                console.error('Error reordering flagged task:', error);
            }
        }
        
        flaggedTasksContainer?.classList.remove('drag-over');
        draggedTaskId = null;
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
    
    // If dropping into completed bucket, mark as completed
    if (newBucket === 'completed' && !task.completed) {
        try {
            toggleTaskCompletion(draggedTaskId);
            // Get fresh reference to task after completing
            task = getTaskById(draggedTaskId);
        } catch (error) {
            console.error('Error completing task:', error);
        }
    }
    
    // If task is flagged and being dropped into a bucket, unflag it first
    const wasFlagged = task.flagged;
    if (wasFlagged) {
        try {
            toggleTaskFlag(draggedTaskId);
            // Get fresh reference to task after unflagging
            task = getTaskById(draggedTaskId);
        } catch (error) {
            console.error('Error unflagging task:', error);
        }
    }
    
    // Find the drop position in the target bucket
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    let insertBeforeTaskId = null;
    let closestCard = null;
    let closestDistance = Infinity;
    
    // Get all task cards in the target bucket (excluding the dragged one)
    const taskCards = Array.from(bucketTasksElement.querySelectorAll('.task-card'))
        .filter(card => card.getAttribute('data-task-id') !== draggedTaskId);
    
    // Find the closest task card to the drop position
    for (let i = 0; i < taskCards.length; i++) {
        const card = taskCards[i];
        const cardRect = card.getBoundingClientRect();
        const cardCenterX = cardRect.left + (cardRect.width / 2);
        const cardCenterY = cardRect.top + (cardRect.height / 2);
        
        // Calculate distance from mouse to card center
        const distanceX = mouseX - cardCenterX;
        const distanceY = mouseY - cardCenterY;
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestCard = {
                id: card.getAttribute('data-task-id'),
                centerX: cardCenterX,
                centerY: cardCenterY,
                rect: cardRect
            };
        }
    }
    
    // Determine insert position based on closest card
    if (closestCard) {
        // If mouse is above the card's vertical center, insert before
        // If mouse is to the left of the card's horizontal center (and roughly same row), insert before
        if (mouseY < closestCard.centerY || 
            (Math.abs(mouseY - closestCard.centerY) < closestCard.rect.height / 2 && mouseX < closestCard.centerX)) {
            insertBeforeTaskId = closestCard.id;
        } else {
            // Insert after the closest card - find the next card in the grid
            const allCards = Array.from(bucketTasksElement.querySelectorAll('.task-card'));
            const closestIndex = allCards.findIndex(card => card.getAttribute('data-task-id') === closestCard.id);
            if (closestIndex >= 0 && closestIndex < allCards.length - 1) {
                insertBeforeTaskId = allCards[closestIndex + 1].getAttribute('data-task-id');
            }
        }
    }
    
    // If no insert position found, insertBeforeTaskId stays null (adds to end)
    
    // Check if moving to different bucket or reordering within same bucket
    if (task.bucket !== newBucket) {
        // Moving to different bucket - change bucket first, then reorder
        try {
            moveTaskToBucket(draggedTaskId, newBucket);
            // Now reorder within the new bucket at the drop position
            reorderTaskInBucket(draggedTaskId, insertBeforeTaskId, newBucket);
            saveAndRender();
        } catch (error) {
            console.error('Error moving task:', error);
            alert('Failed to move task');
        }
    } else {
        // Reordering within same bucket
        try {
            reorderTaskInBucket(draggedTaskId, insertBeforeTaskId, newBucket);
            saveAndRender();
        } catch (error) {
            console.error('Error reordering task:', error);
            alert('Failed to reorder task: ' + error.message);
        }
    }
    
    draggedTaskId = null;
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
        
        form.reset();
        document.getElementById('taskId').value = '';
        
        // Restore preserved bucket or default to 'this-week'
        if (bucketSelect) {
            bucketSelect.value = preservedBucket || 'this-week';
        }
        
        document.getElementById('taskFlagged').checked = false;
        document.getElementById('recurringOptions').style.display = 'none';
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

// Save and render
async function saveAndRender() {
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
    
    // Check if we're in completed view
    const completedView = document.getElementById('completedView');
    if (completedView && completedView.style.display !== 'none') {
        renderCompletedView();
    } else {
        renderBuckets();
    }
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

// Initialize UI event listeners
function initializeUI() {
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
    document.getElementById('deleteBtn').addEventListener('click', () => {
        if (currentEditingTaskId && confirm('Are you sure you want to delete this task?')) {
            deleteTask(currentEditingTaskId);
            closeTaskModal();
            saveAndRender();
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
            if (bucketTasks && bucketTasks.style.display === 'none') {
                // Bucket is minimized, highlight the header
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
            
            // Bottom row buckets (next-month, recurring, someday) - allow drop without expanding
            const bottomRowBuckets = ['next-month', 'recurring', 'someday'];
            if (bottomRowBuckets.includes(bucketId) && bucketTasks && bucketTasks.style.display === 'none') {
                // Don't expand, just handle the drop directly
                handleDrop({
                    ...e,
                    currentTarget: bucketTasks,
                    preventDefault: () => {},
                    stopPropagation: () => {}
                });
            } else if (bucketTasks) {
                // Top row buckets or already expanded - expand first if needed
                if (bucketTasks.style.display === 'none') {
                    const toggle = document.getElementById(`${bucketId}-toggle`);
                    if (toggle) toggle.click();
                    // Wait a bit for the bucket to expand, then handle the drop
                    setTimeout(() => {
                        handleDrop({
                            ...e,
                            currentTarget: bucketTasks,
                            preventDefault: () => {},
                            stopPropagation: () => {}
                        });
                    }, 50);
                } else {
                    // Bucket is already expanded, handle drop normally
                    handleDrop({
                        ...e,
                        currentTarget: bucketTasks,
                        preventDefault: () => {},
                        stopPropagation: () => {}
                    });
                }
            }
        });
    });
    
    // Set up drag and drop for bucket tasks
    document.querySelectorAll('.bucket-tasks').forEach(el => {
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.add('drag-over');
            
            if (!draggedTaskId) return;
            
            // Find which task we're hovering over based on both X and Y position (for grid layout)
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            const taskCards = Array.from(el.querySelectorAll('.task-card'))
                .filter(card => card.getAttribute('data-task-id') !== draggedTaskId);
            
            // Remove all drag-over-task classes and drop indicators first
            document.querySelectorAll('.task-card').forEach(card => {
                card.classList.remove('drag-over-task', 'drag-over-before', 'drag-over-after', 'drag-over-left', 'drag-over-right');
            });
            
            // Remove any existing drop indicator
            const existingIndicator = el.querySelector('.drop-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            // Find the closest task card
            let closestCard = null;
            let closestDistance = Infinity;
            let insertPosition = 'before'; // 'before', 'after', 'left', 'right'
            
            for (let i = 0; i < taskCards.length; i++) {
                const card = taskCards[i];
                const cardRect = card.getBoundingClientRect();
                const cardCenterX = cardRect.left + (cardRect.width / 2);
                const cardCenterY = cardRect.top + (cardRect.height / 2);
                
                // Calculate distance
                const distanceX = mouseX - cardCenterX;
                const distanceY = mouseY - cardCenterY;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestCard = card;
                    
                    // Determine insert position based on mouse position relative to card
                    // Check if mouse is within the card's vertical bounds (same row)
                    const isInSameRow = mouseY >= cardRect.top && mouseY <= cardRect.bottom;
                    // Check if mouse is within the card's horizontal bounds (same column)
                    const isInSameColumn = mouseX >= cardRect.left && mouseX <= cardRect.right;
                    
                    // If mouse is in the same row (or very close), prioritize horizontal positioning
                    if (isInSameRow || Math.abs(distanceY) < cardRect.height * 0.3) {
                        // Horizontal positioning - left or right
                        if (mouseX < cardCenterX) {
                            insertPosition = 'left';
                        } else {
                            insertPosition = 'right';
                        }
                    } else if (isInSameColumn || Math.abs(distanceX) < cardRect.width * 0.3) {
                        // Vertical positioning - top or bottom
                        if (mouseY < cardCenterY) {
                            insertPosition = 'before';
                        } else {
                            insertPosition = 'after';
                        }
                    } else {
                        // Determine based on which axis has the smaller distance
                        if (Math.abs(distanceX) < Math.abs(distanceY)) {
                            // Closer horizontally - use left/right
                            if (mouseX < cardCenterX) {
                                insertPosition = 'left';
                            } else {
                                insertPosition = 'right';
                            }
                        } else {
                            // Closer vertically - use top/bottom
                            if (mouseY < cardCenterY) {
                                insertPosition = 'before';
                            } else {
                                insertPosition = 'after';
                            }
                        }
                    }
                }
            }
            
            // Show visual indicator
            if (closestCard) {
                const cardRect = closestCard.getBoundingClientRect();
                const containerRect = el.getBoundingClientRect();
                
                // Remove all position classes first
                closestCard.classList.remove('drag-over-before', 'drag-over-after', 'drag-over-left', 'drag-over-right');
                
                // Add appropriate class
                if (insertPosition === 'before') {
                    closestCard.classList.add('drag-over-before');
                } else if (insertPosition === 'after') {
                    closestCard.classList.add('drag-over-after');
                } else if (insertPosition === 'left') {
                    closestCard.classList.add('drag-over-left');
                } else if (insertPosition === 'right') {
                    closestCard.classList.add('drag-over-right');
                }
                
                // Add drop indicator line
                const indicator = document.createElement('div');
                indicator.className = 'drop-indicator';
                
                if (insertPosition === 'left' || insertPosition === 'right') {
                    // Horizontal indicator (vertical line on left or right)
                    if (insertPosition === 'left') {
                        indicator.style.left = (cardRect.left - containerRect.left - 2) + 'px';
                        indicator.style.top = (cardRect.top - containerRect.top) + 'px';
                        indicator.style.width = '3px';
                        indicator.style.height = cardRect.height + 'px';
                    } else {
                        indicator.style.left = (cardRect.right - containerRect.left + 2) + 'px';
                        indicator.style.top = (cardRect.top - containerRect.top) + 'px';
                        indicator.style.width = '3px';
                        indicator.style.height = cardRect.height + 'px';
                    }
                } else {
                    // Vertical indicator (horizontal line on top or bottom)
                    if (insertPosition === 'before') {
                        indicator.style.top = (cardRect.top - containerRect.top - 2) + 'px';
                    } else {
                        indicator.style.top = (cardRect.bottom - containerRect.top + 2) + 'px';
                    }
                    indicator.style.left = (cardRect.left - containerRect.left) + 'px';
                    indicator.style.width = cardRect.width + 'px';
                    indicator.style.height = '3px';
                }
                
                el.appendChild(indicator);
            } else if (taskCards.length === 0) {
                // Empty bucket - show indicator at top
                const indicator = document.createElement('div');
                indicator.className = 'drop-indicator';
                indicator.style.top = '0px';
                indicator.style.left = '0px';
                indicator.style.width = '100%';
                indicator.style.height = '3px';
                el.appendChild(indicator);
            }
        });
        
        el.addEventListener('dragleave', (e) => {
            // Only remove if leaving the bucket area, not just moving between children
            if (!el.contains(e.relatedTarget)) {
                el.classList.remove('drag-over');
                document.querySelectorAll('.task-card').forEach(card => {
                    card.classList.remove('drag-over-task', 'drag-over-before', 'drag-over-after', 'drag-over-left', 'drag-over-right');
                });
                const indicator = el.querySelector('.drop-indicator');
                if (indicator) indicator.remove();
            }
        });
        
        el.addEventListener('drop', handleDrop);
        
        // Click on empty space in bucket to add task with that bucket pre-selected
        el.addEventListener('click', (e) => {
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
            openTaskModal();
        });
        
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
    const buckets = ['this-week', 'next-week', 'this-month', 'next-month', 'recurring', 'someday'];
    const topRowBuckets = ['this-week', 'next-week', 'this-month'];
    
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
    
    // Initialize Pomodoro timer
    initializePomodoro();
    
    // Add window resize listener to recalculate card sizes
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            optimizeAllBucketsCardSizing();
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
    
    if (completedView && bucketsContainer) {
        bucketsContainer.style.display = 'none';
        if (flaggedSection) flaggedSection.style.display = 'none';
        completedView.style.display = 'block';
        renderCompletedView();
    }
}

// Show main view
function showMainView() {
    const completedView = document.getElementById('completedView');
    const bucketsContainer = document.querySelector('.buckets-container');
    
    if (completedView && bucketsContainer) {
        completedView.style.display = 'none';
        bucketsContainer.style.display = 'grid';
        renderBuckets();
    }
}

// Render completed tasks view
function renderCompletedView() {
    const completedTasksGrid = document.getElementById('completedTasksGrid');
    if (!completedTasksGrid) return;
    
    const completedTasks = getAllTasks().filter(task => task.completed === true);
    
    // Sort by completed date (most recent first)
    completedTasks.sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
    });
    
    if (completedTasks.length === 0) {
        completedTasksGrid.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 2rem;">No completed tasks yet.</p>';
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
                    deleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this task?')) {
                            deleteTask(task.id);
                            saveAndRender();
                        }
                    });
                    taskActions.appendChild(deleteBtn);
                }
            }
        });
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

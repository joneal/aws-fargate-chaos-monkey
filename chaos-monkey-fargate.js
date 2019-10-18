// NOTE: Set Lambda timeout to at least 60 seconds
const AWS = require('aws-sdk');

AWS.config.region = 'us-east-1';

const ecs = new AWS.ECS({ apiVersion: '2014-11-13' });
const sns = new AWS.SNS({ apiVersion: '2016-11-15' });

// ARN of the SNS topic to get generate exceptions
// *** UPDATE FOR YOUR REGION, ACCOUNT, AND SNS TOPIC ***
const TOPIC_INFORMATION_ARN = 'arn:aws:sns:[REGION]:[ACCOUNT NUMBER]:[SNS TOPIC]';

// *** MODIFY SETTINGS HERE FOR YOUR FARGATE CLUSTERS
const FARGATE_CLUSTERS = [
    {
        cluster: "ecs-dev",
        period: 15,  // 4 times an hour
        enabled: false
    },
    {
        cluster: "ecs-stage",
        period: 30,  // 2 times an hour
        enabled: false
    },
    {
        cluster: "ecs-prod",
        period: 60,  // 1 time an hour
        enabled: false
    }];

// Called every 15 minutes using CRON, so minute value should be 00, 15, 30, 45
async function main(event) {
    try {

        // For each ECS cluster listed above...
        for (var i = 0; i < FARGATE_CLUSTERS.length; i++) {

            // Only kill a task if cluster is enabled
            if (FARGATE_CLUSTERS[i].enabled) {

                let date = new Date(event.time);
                let minutes = date.getMinutes();                

                // Only kill a task if schedule matches the current time
                if ((minutes % FARGATE_CLUSTERS[i].period) == 0) {
                   
                    // Get the list of currently running Fargate tasks in the cluster.
                    var res = await ecs.listTasks({
                        cluster: FARGATE_CLUSTERS[i].cluster,
                        desiredStatus: 'RUNNING',
                        launchType: 'FARGATE'
                    }).promise();

                    // Select one of the tasks at random for termination.
                    var index = Math.floor(Math.random() * res.taskArns.length);
                    var doomedTask = res.taskArns[index];

                    // Kill the selected task.
                    await ecs.stopTask({
                        cluster: FARGATE_CLUSTERS[i].cluster,
                        task: doomedTask,
                        reason: 'CHAOS MONKEY'
                    }).promise();
                }
            }
        }
    } catch (err) {
        console.log(err.stack);
        await sns.publish({
            Message: err.stack,
            Subject: 'Chaos Monkey Fargate',
            TopicArn: TOPIC_INFORMATION_ARN
        }).promise();
    }
};

exports.handler = async (event) => {
    await main(event);
};

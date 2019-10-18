# AWS Fargate Chaos Monkey

One of the tenets of cloud best practices is that software and hardware systems should be architected for the random yet expected failure of system components.

Cloud-hosted compute components in system architectures should be viewed as cheap, anonymous, commodity instances (pawns) that could fail at any time. The failure rate can be compounded by the fact that the number and uniqueness of the instances can increase due to horizontal scaling events, thereby increasing the odds of an instance failure. However, a more insidious failure can be due to deployed software. With the current industry standard of microservice architecture, losing an instance hosting specific services could invoke a significant, cascading detrimental effect of the overall system stability and performance. With the concepts of continuous integration and domain separation, even innocuously deployed software changes could have catastrophic consequences if the associated application is suddenly and unexpectedly lost due to instance failure.

> “Everything fails, all of the time.’ — Werner Vogels, CTO of AWS.

Systems should be architected and implemented to be resilient in the event of an instance failure. Purposely injecting failures in software systems can help ensure the robustness of these systems when subjected to unexpected instance failures.

### Chaos Monkey

What if instead of waiting for an instance to fail, one took offensive tactical actions in purposely causing instance failure to ensure the overall system stability and health remained intact? Netflix's popular [Chaos Monkey](https://netflix.github.io/chaosmonkey/)  application does just that; randomly terminating instances to ensure there are no overall detrimental effects to production systems due to instance failures. Instances are terminated during "business hours" so that developers and support staff can be available to address any issues that arise due to software applications/services lost because of instance termination.

When using AWS Fargate, containers run on instances controlled by AWS/ECS, thereby utilizing Chaos Monkey in this scenario next to impossible. However, by killing ECS tasks instead of the hosts (instances), a Fargate version of Chaos Monkey can be created to provide the same type of offensive capabilities for system testing.

### Architecture

Two primary AWS services are used to implement Fargate Chaos Monkey: CloudWatch and Lambda.

A CloudWatch scheduled event is used to trigger a Lambda function every 15 minutes, at 00, 15, 30, 45 minutes past the hour. This event also only fires during business hours (8:00 AM -5:00 PM EDT, MON-FRI). The CloudWatch event passes the trigger time to the Lambda function in which the function can use as a filter to kill Fargate tasks at different periods per ECS cluster.

The Lambda function manages the Fargate tasks using the AWS SDK for ECS. It specifically calls the "listTasks" SDK function to get a list of all running Fargate tasks per cluster and then calls "stopTask" on a random task from the queried list.

A diagram of the architecture can be found [here](https://jdo-github-images.s3.amazonaws.com/aws-fargate-chaos-monkey.png).

### Configuration

An AWS CloudFormation contains all required components for building a stack to support the CloudWatch scheduled events and the Lambda function. This template also includes the required IAM role and policy for the Lambda function to access ECS (Fargate), CloudWatch logging, and SNS for exception notification.

The CloudFormation template creates an empty NodeJS handler function. The function source code, in NodeJS, is managed in a separate file. The contents of this file should be copied over the empty function code.

Users are prompted for the CRON strings for task period time when the CloudFormation template is created. This value can also be changed with a CloudFormation "update" template action.

